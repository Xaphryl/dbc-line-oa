/**
 * Verification state machine handler.
 * Steps: awaiting_phone → awaiting_national_id → awaiting_name_confirm → bound
 *
 * Keywords handled here (inside active session):
 *   ย้อนกลับ — resets from S2 back to S1 (re-enter phone)
 *
 * Keywords handled before reaching this handler (index.ts):
 *   ยกเลิก    — cancel at any step
 *   ลงทะเบียน — restart from S1 (unbind + re-register)
 *   id        — get raw LINE user ID
 *
 * Hero image URLs are stored in the session (ri field) so every step uses
 * the correct image without an extra network call.
 */

import type {
  LineMessageEvent,
  Env,
  SessionState,
  RegImages,
  ResolveByPhoneResponse,
  VerifyAndBindResponse,
  NextAppointmentsResponse,
} from '../types';
import { phpPost, phpGet, PhpApiError } from '../api/php';
import { resolveRegImages } from '../regImages';
import { replyToLine, textMessage } from '../line/reply';
import { setSession, clearSession } from '../session';
import { buildVerifyPromptFlex } from '../flex/verifyPrompt';
import { buildAskNationalIDFlex } from '../flex/askNationalId';
import { buildConfirmNameFlex } from '../flex/confirmName';
import { buildBindSuccessFlex } from '../flex/bindSuccess';
import { buildNextAppointmentFlex } from '../flex/nextAppointment';
import { buildEmptyStateFlex } from '../flex/emptyState';
import { normalizePhone, maskNationalId } from '../phoneNormalize';
import { formatThaiPhone } from '../phoneFormat';
import { STRINGS, BACK_KEYWORD } from '../constants';


export async function handleVerify(
  event: LineMessageEvent,
  env: Env,
  session: SessionState,
  text: string,
): Promise<void> {
  const userId = event.source.userId ?? null;
  if (!userId) return;

  const kv = env.LINE_OA_KV;

  // Pull resolved image URLs from session; ri is always present on all session variants
  const ri: RegImages = session.ri;

  // ── awaiting_phone ────────────────────────────────────────────────────────
  if (session.step === 'awaiting_phone') {
    const digits = normalizePhone(text);
    if (digits.length < 9 || digits.length > 10) {
      await replyToLine(event.replyToken, [textMessage(STRINGS.PHONE_NOT_FOUND)], env);
      return;
    }

    let candidates: number[];
    try {
      const res = await phpPost<ResolveByPhoneResponse>(
        '/resolve-by-phone.php',
        { phone_digits: digits },
        env,
      );
      candidates = res.candidates;
    } catch (err) {
      if (err instanceof PhpApiError && err.statusCode === 404) {
        await replyToLine(event.replyToken, [textMessage(STRINGS.PHONE_NOT_FOUND)], env);
        return;
      }
      await replyToLine(event.replyToken, [textMessage(STRINGS.GENERIC_ERROR)], env);
      return;
    }

    // Lazily resolve step images now (2s cap — fails gracefully to empty strings)
    const resolvedRi = await resolveRegImages(env);

    const formattedPhone = formatThaiPhone(digits);
    await setSession(kv, userId, { step: 'awaiting_national_id', candidates, phone: digits, ri: resolvedRi });
    await replyToLine(
      event.replyToken,
      [buildAskNationalIDFlex(formattedPhone, resolvedRi.s2, env.CLINIC_PHONE)],
      env,
    );
    return;
  }

  // ── awaiting_national_id ──────────────────────────────────────────────────
  if (session.step === 'awaiting_national_id') {
    // ย้อนกลับ — reset to S1
    if (text === BACK_KEYWORD) {
      await setSession(kv, userId, { step: 'awaiting_phone', ri });
      await replyToLine(
        event.replyToken,
        [buildVerifyPromptFlex(ri.s1, env.CLINIC_PHONE)],
        env,
      );
      console.log('[verify] ย้อนกลับ → S1');
      return;
    }

    // Normalise: strip spaces / dashes before the 13-digit check
    const rawId = normalizePhone(text); // re-uses the digit-stripper
    if (!/^\d{13}$/.test(rawId)) {
      await replyToLine(event.replyToken, [textMessage(STRINGS.NATIONAL_ID_MISMATCH)], env);
      return;
    }

    let fname: string;
    let lname: string;
    let patNum: number;
    try {
      const res = await phpPost<VerifyAndBindResponse>(
        '/verify-and-bind.php',
        { line_user_id: userId, candidates: session.candidates, national_id: rawId },
        env,
      );
      patNum = res.patNum;
      fname = res.fname;
      lname = res.lname;
    } catch (err) {
      if (err instanceof PhpApiError && err.statusCode === 404) {
        await replyToLine(event.replyToken, [textMessage(STRINGS.NATIONAL_ID_MISMATCH)], env);
        return;
      }
      await replyToLine(event.replyToken, [textMessage(STRINGS.GENERIC_ERROR)], env);
      return;
    }

    const formattedPhone = formatThaiPhone(session.phone);
    const maskedId = maskNationalId(rawId);
    await setSession(kv, userId, {
      step: 'awaiting_name_confirm',
      patNum,
      fname,
      lname,
      phone: session.phone,
      nationalId: rawId,
      ri,
    });
    await replyToLine(
      event.replyToken,
      [buildConfirmNameFlex(fname, lname, formattedPhone, maskedId, ri.s3, env.CLINIC_PHONE)],
      env,
    );
    return;
  }

  // ── awaiting_name_confirm ─────────────────────────────────────────────────
  if (session.step === 'awaiting_name_confirm') {
    const formattedPhone = formatThaiPhone(session.phone);
    const maskedId = maskNationalId(session.nationalId);

    if (/^(ใช่|yes)/i.test(text)) {
      // Patient confirmed — call confirm-bind
      try {
        await phpPost(
          '/confirm-bind.php',
          { line_user_id: userId, patNum: session.patNum },
          env,
        );
      } catch (err) {
        if (err instanceof PhpApiError && err.statusCode === 409) {
          await clearSession(kv, userId);
          await replyToLine(event.replyToken, [textMessage(STRINGS.BIND_CONFLICT)], env);
          return;
        }
        await replyToLine(event.replyToken, [textMessage(STRINGS.GENERIC_ERROR)], env);
        return;
      }

      await clearSession(kv, userId);

      // Chain: bind success + appointments
      const bindSuccessCard = buildBindSuccessFlex(ri.complete, env.CLINIC_PHONE);
      try {
        const res = await phpGet<NextAppointmentsResponse>(
          `/next-appointments.php?patNum=${session.patNum}`,
          env,
        );
        const { days } = res;
        if (!Array.isArray(days) || days.length === 0) {
          await replyToLine(
            event.replyToken,
            [bindSuccessCard, buildEmptyStateFlex(ri.no_apt, env.CLINIC_PHONE)],
            env,
          );
        } else {
          await replyToLine(
            event.replyToken,
            [bindSuccessCard, buildNextAppointmentFlex(days, env.CLINIC_PHONE)],
            env,
          );
        }
      } catch {
        // Appointments fetch failed — show bind success at minimum
        await replyToLine(event.replyToken, [bindSuccessCard], env);
      }
      return;
    }

    if (/^(ไม่|no)/i.test(text)) {
      await clearSession(kv, userId);
      await replyToLine(event.replyToken, [textMessage(STRINGS.NO_CONFIRM_REPLY)], env);
      return;
    }

    // Any other input — keep session alive, resend card with a reminder
    await replyToLine(
      event.replyToken,
      [
        textMessage(STRINGS.S3_LOOP_REMINDER),
        buildConfirmNameFlex(
          session.fname,
          session.lname,
          formattedPhone,
          maskedId,
          ri.s3,
          env.CLINIC_PHONE,
        ),
      ],
      env,
    );
  }
}

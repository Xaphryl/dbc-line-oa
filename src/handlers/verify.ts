/**
 * Verification state machine handler.
 * Steps: awaiting_phone → awaiting_national_id → awaiting_name_confirm → bound
 */

import type {
  LineMessageEvent,
  Env,
  SessionState,
  ResolveByPhoneResponse,
  VerifyAndBindResponse,
  NextAppointmentsResponse,
} from '../types';
import { phpPost, phpGet, PhpApiError } from '../api/php';
import { replyToLine, textMessage } from '../line/reply';
import { setSession, clearSession } from '../session';
import { buildAskNationalIDFlex } from '../flex/askNationalId';
import { buildConfirmNameFlex } from '../flex/confirmName';
import { buildBindSuccessFlex } from '../flex/bindSuccess';
import { buildNextAppointmentFlex } from '../flex/nextAppointment';
import { buildEmptyStateFlex } from '../flex/emptyState';
import { normalizePhone } from '../phoneNormalize';
import { STRINGS } from '../constants';

export async function handleVerify(
  event: LineMessageEvent,
  env: Env,
  session: SessionState,
  text: string,
): Promise<void> {
  const userId = event.source.userId ?? null;
  if (!userId) return;

  const kv = env.LINE_OA_KV;
  const defaultImageUrl = `${env.IMAGE_BASE_URL}/default.jpg`;

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

    await setSession(kv, userId, { step: 'awaiting_national_id', candidates });
    await replyToLine(event.replyToken, [buildAskNationalIDFlex(defaultImageUrl, env.CLINIC_PHONE)], env);
    return;
  }

  // ── awaiting_national_id ──────────────────────────────────────────────────
  if (session.step === 'awaiting_national_id') {
    if (!/^\d{13}$/.test(text)) {
      await replyToLine(event.replyToken, [textMessage(STRINGS.NATIONAL_ID_MISMATCH)], env);
      return;
    }

    let fname: string;
    let lname: string;
    let patNum: number;
    try {
      const res = await phpPost<VerifyAndBindResponse>(
        '/verify-and-bind.php',
        { line_user_id: userId, candidates: session.candidates, national_id: text },
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

    await setSession(kv, userId, { step: 'awaiting_name_confirm', patNum, fname, lname });
    await replyToLine(
      event.replyToken,
      [buildConfirmNameFlex(fname, lname, defaultImageUrl, env.CLINIC_PHONE)],
      env,
    );
    return;
  }

  // ── awaiting_name_confirm ─────────────────────────────────────────────────
  if (session.step === 'awaiting_name_confirm') {
    if (/^(ใช่|yes)/i.test(text)) {
      // User confirmed — call confirm-bind
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
      const bindSuccessCard = buildBindSuccessFlex(defaultImageUrl, env.CLINIC_PHONE);
      try {
        const res = await phpGet<NextAppointmentsResponse>(
          `/next-appointments.php?patNum=${session.patNum}`,
          env,
        );
        const { days, image_url: imageUrl } = res;
        if (days.length === 0) {
          await replyToLine(
            event.replyToken,
            [bindSuccessCard, buildEmptyStateFlex(defaultImageUrl, env.CLINIC_PHONE)],
            env,
          );
        } else {
          await replyToLine(
            event.replyToken,
            [bindSuccessCard, buildNextAppointmentFlex({ days, imageUrl }, env.CLINIC_PHONE)],
            env,
          );
        }
      } catch {
        // Appointments fetch failed — at least show bind success
        await replyToLine(event.replyToken, [bindSuccessCard], env);
      }
      return;
    }

    if (/^(ไม่|no)/i.test(text)) {
      await clearSession(kv, userId);
      await replyToLine(
        event.replyToken,
        [textMessage('กรุณาติดต่อคลินิกเพื่อยืนยันตัวตน')],
        env,
      );
      return;
    }

    // Other text — stay in state, remind
    await replyToLine(
      event.replyToken,
      [buildConfirmNameFlex(session.fname, session.lname, defaultImageUrl, env.CLINIC_PHONE)],
      env,
    );
  }
}

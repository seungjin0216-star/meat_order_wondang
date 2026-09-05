/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  [장수한우 원당점] 발주 GAS                                       ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * 2026-09-04 — 백석_코드.gs 를 복제해 만들었습니다.
 *
 * 🔑 SOLAPI_API_KEY / SOLAPI_API_SECRET 는 일부러 비워두었습니다.
 *    이 파일은 깃허브에 올라갈 수 있으므로 실제 키를 절대 적지 마세요.
 *    실제 값은 Apps Script 편집기의 「프로젝트 설정 > 스크립트 속성」에만 둡니다.
 *
 * ── 백석과 다른 점 (이 셋뿐입니다) ──────────────────────────
 *   ① BRANCH 가 '원당점'
 *        시트 기록·문자 제목이 전부 이 상수를 씁니다.
 *   ② 식자재 업체가 셋뿐 — 콩나물 · 주류 · 음료수
 *        나머지는 영수증분석기로 넣습니다.
 *   ③ 화요일 지연 발송이 없음
 *        원당은 연중무휴라 미룰 이유가 없습니다.
 *        (백석은 화요일 휴무 → 월·화 발주를 화요일 20:30 으로 미룸)
 *
 * ⚠️ 백석과 두 벌로 나뉘어 있습니다.
 *    한쪽 버그를 고치면 **다른 쪽도 같이 고쳐야 합니다.**
 *    합치지 않은 이유는 백석 발주가 매일 돌아가는 실전 시스템이라
 *    건드리다 멈추면 그날 장사에 지장이 생기기 때문입니다.
 *
 * ⚠️ 발신번호가 아직 백석 것입니다.
 *    솔라피에 원당 관리자(아버지) 번호를 「개인 → 개인」 위임으로
 *    등록한 뒤 SENDER_NUMBER 를 바꾸세요.
 *    필요 서류: 통신서비스이용증명원 · 위임장 · 신분증 사본
 */

// 이 파일이 어느 지점 것인지 — 여기 한 곳만 봅니다
var BRANCH = '원당점';

// ============================================================
//  장수한우곱창 백석점 — Google Apps Script
//  파일명: 백석_코드.gs  |  v2.2
//
//  ⚠️ 이것은 백업본입니다. 실제 동작하는 코드는 Apps Script 편집기 안에 있습니다.
//     script.google.com → 「고기주문_백석」 프로젝트
//     여기를 고쳐도 실제 동작은 바뀌지 않습니다. 편집기에 붙여넣어야 적용됩니다.
//
//  🔑 SOLAPI_API_KEY / SOLAPI_API_SECRET 는 일부러 비워두었습니다.
//     이 파일은 깃허브에 올라갈 수 있으므로 실제 키를 절대 적지 마세요.
//     실제 값은 Apps Script 편집기 안에만 존재합니다.
//
//  [v2.2 변경사항] (2026-08-22)
//    ⚠️ 2026-08-18 사고 — 월요일 장사 마감이 늦어져 화요일 00:35 에 발주를 넣었더니
//       그 자리에서 업체로 문자가 나가버렸다. 화요일 저녁에 나갔어야 했다.
//
//    - 「영업일」 개념 추가. 새벽 8시 이전은 전날 영업분으로 본다.
//      가게가 자정을 넘겨 영업하는데 코드는 자정에 날을 바꿔서 생긴 틈이었다.
//      화면(food.html)도 날짜만 영업일로 보고 시각은 실제 시계를 써서 같은 문제가 있었다.
//    - 식자재 지연 여부를 서버가 직접 판단. 화면이 보내는 값은 참고만 한다.
//      (브라우저에 옛 화면이 캐시돼 있으면 틀린 값이 오기 때문)
//    - 휴무 판정을 셋으로 분리 — 우리 가게 / 고기 업체 / 식자재 업체
//        우리 가게    화요일만. 공휴일에도 영업
//        고기 업체    화요일 + 공휴일 전부 휴무
//        식자재 업체   공휴일에도 일함
//      예전엔 하나로 묶여 있어서 공휴일 전날 발주가 이유 없이 밀렸다.
//    - 예약 시각이 이미 지난 경우(예: 화요일 21시 발주) 즉시 발송으로 전환
//
//  [v2.1 변경사항] (2026-07-17)
//    - 화요일 고정휴무 + 공휴일(정적 리스트)일 때 고기 발주 자동 지연발송을
//      일반화. 예전에는 월요일에만 이 처리가 되어 있어서, 화요일이 아닌
//      다른 휴무일(공휴일 등) 전날 주문은 그냥 평소처럼 나가버렸음.
//    - HOLIDAYS_2026 정적 목록 + isClosedDay() 헬퍼 추가. 매년 12월경
//      다음 해 공휴일을 이 목록에 추가해줘야 함.
//
//  [v2.0 변경사항]
//    - 식자재 발주 기능 통합 (food_order type)
//    - 식자재 발주: Solapi SMS/LMS 발송 (업체별 문자)
//    - 식자재 월·화 발주 → 화요일 20:30 자동 발송
//    - 식자재 발주 기록 → 기존 스프레드시트에 '식자재발주' 시트 추가
//
//  [v1.1 변경사항]
//    - 월요일 발주 시 업체 문자를 화요일 20:00으로 자동 지연 발송
//    - 화요일 발주 알림 자동 skip (백석 휴무)
// ============================================================

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  🔑 키는 코드에 적지 않는다
//
//  스크립트 속성에 저장해두면 이 파일을 통째로 복사·백업해도 키가 새지 않는다.
//  코드를 다시 붙여넣어도 키는 그대로 남는다 (예전처럼 매번 다시 넣을 필요 없음).
//
//  설정 방법 (딱 한 번만):
//    Apps Script 편집기 → 왼쪽 ⚙️ 프로젝트 설정 → 맨 아래 스크립트 속성
//    → 「스크립트 속성 추가」 로 아래 두 개 등록
//        SOLAPI_API_KEY      = 솔라피 API Key
//        SOLAPI_API_SECRET   = 솔라피 API Secret
//    → 등록 후 checkSolapiKeys() 를 실행해서 확인
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const _PROPS = PropertiesService.getScriptProperties();

const CONFIG = {
  SOLAPI_API_KEY    : (_PROPS.getProperty('SOLAPI_API_KEY')    || '').trim(),
  SOLAPI_API_SECRET : (_PROPS.getProperty('SOLAPI_API_SECRET') || '').trim(),

  // 발송이 실패했을 때 알림을 받을 이메일 (솔라피가 막혀도 이건 나감)
  OWNER_EMAIL       : 'seungjin0216@gmail.com',

  SENDER_NUMBER     : '01041216995',
  VENDOR_NUMBER     : '01041216995',
  OWNER_NUMBER      : '01053226995',
  BAESEOK_ADMIN     : '01041216995',

  KAKAO: {
    PFID : 'KA01PF260426075804420VO8o8M5w9IQ',
    TEMPLATES: {
      ORDER_REMINDER : 'KA01TP260426075940443LF7oyhJVJnq',
      ORDER_REPORT   : 'KA01TP260426080250645hFylvbOFfd2',
      STOCK_REPORT   : 'KA01TP260426080045813YtTbrFxp0yz',
      VENDOR_ORDER   : 'KA01TP260426080129891HOhFBeJ7ijV',
    }
  },

  BAESEOK: {
    TARGET_BY_DAY : [3, 3, 3, 3, 4, 4, 4],
    MIN_ORDER : 1,
    MAX_ORDER : 2,
  },

  // ── [v2.0 추가] 식자재 발주 설정 ─────────────────────────
  FOOD: {
    SHEET_NAME     : '식자재발주',
    SMS_MAX_BYTES  : 90,
    LMS_MAX_BYTES  : 2000,
    // 업체 전화번호 (숫자만, 하이픈 없이) — 확인 후 채워넣기
    PHONES: {
      '미락'    : '01041216995',   // TODO
      '콩나물'  : '01041216995',   // TODO
      '원당'    : '01041216995',   // TODO
      '네이버'  : '01041216995',   // TODO
      '사장님'  : '01053226995',
      '배달관련': '01041216995',   // TODO
      '주류'    : '01041216995',   // TODO
      '음료수'  : '01041216995',   // TODO
    },
  },

  HOLIDAY_API_KEY : '',
  SPREADSHEET_ID  : '10v0LxS97dofRa_jE7U2gYzwveqrxfGirCD9B-Zuon5o',
  SHEET_ORDER     : '발주기록',
  SHEET_STOCK     : '입고기록',
  SHEET_FAIL      : '발송실패',   // 실패 이력이 쌓이는 곳
};


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ⓪ 실패 알림 — 조용한 실패를 막는 핵심
//
//  왜 이메일인가
//    솔라피가 막혀서 실패한 건데 알림을 또 솔라피로 보내면 그것도 실패한다.
//    MailApp 은 구글 내장이라 솔라피 상태와 무관하게 나간다. 키도 필요 없다.
//    (구글 계정 기준 하루 100통까지 무료 — 실패 알림 용도로는 충분)
//
//  2026-08-11 사고
//    솔라피에 IP 접근 제한이 걸려 GAS(구글 서버 IP)가 차단됐다.
//    발송은 전부 실패했는데 로그에는 "발송 완료"만 찍혀서 아무도 몰랐다.
//    발주 문자가 안 나가면 고기가 안 들어온다. 반드시 알아야 한다.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function alertFailure(제목, 내용, 사유) {
  console.log('🚨 발송 실패 [' + 제목 + '] ' + 사유);

  // 이메일과 시트 기록은 서로 독립적으로 시도한다.
  // 하나가 실패해도 다른 하나는 남아야 한다.
  try {
    MailApp.sendEmail(
      CONFIG.OWNER_EMAIL,
      '🚨 [백석점] ' + 제목,
      '발송에 실패했습니다.\n' +
      '━━━━━━━━━━━━━━━━━━━━\n' +
      '내용: ' + 내용 + '\n' +
      '사유: ' + 사유 + '\n' +
      '시각: ' + formatDate(new Date()) + ' ' +
                 Utilities.formatDate(new Date(), 'Asia/Seoul', 'HH:mm') + '\n' +
      '━━━━━━━━━━━━━━━━━━━━\n\n' +
      '👉 업체에 직접 연락해서 발주하세요.\n\n' +
      '자주 나오는 원인\n' +
      ' · 허용되지 않은 IP  → 솔라피에서 IP 접근 제한 해제\n' +
      ' · 잔액 부족        → 솔라피 충전\n' +
      ' · 발신번호 미등록   → 솔라피 발신번호 등록 확인\n'
    );
  } catch (e) {
    console.log('실패 알림 메일 전송 실패: ' + e.message);
  }

  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let sheet = ss.getSheetByName(CONFIG.SHEET_FAIL);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.SHEET_FAIL);
      sheet.appendRow(['시각', '지점', '구분', '내용', '사유', '조치완료']);
      sheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#fee2e2');
    }
    sheet.appendRow([
      Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm'),
      BRANCH, 제목, 내용, 사유, '',
    ]);
  } catch (e) {
    console.log('실패 시트 기록 실패: ' + e.message);
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  [v2.1 추가] 화요일 고정휴무 + 공휴일 판정 (정적 목록)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 한국 공휴일은 정부가 매년 미리 발표하므로, 여기 날짜만 매년 갱신하면 됨.
// (대체공휴일 포함. 2026년: 제헌절이 18년 만에 공휴일로 재지정되어 포함됨)
const HOLIDAYS_2026 = [
  '2026-01-01', // 신정
  '2026-02-16', '2026-02-17', '2026-02-18', // 설날 연휴
  '2026-03-01', // 삼일절
  '2026-03-02', // 대체공휴일(삼일절)
  '2026-05-05', // 어린이날
  '2026-05-24', // 부처님오신날
  '2026-05-25', // 대체공휴일(부처님오신날)
  '2026-06-06', // 현충일
  '2026-07-17', // 제헌절
  '2026-08-15', // 광복절
  '2026-08-17', // 대체공휴일(광복절)
  '2026-09-24', '2026-09-25', '2026-09-26', // 추석 연휴
  '2026-10-03', // 개천절
  '2026-10-05', // 대체공휴일(개천절)
  '2026-10-09', // 한글날
  '2026-12-25', // 크리스마스
];

// ⚠️ [v2.2] "누가 쉬는 날인가" 를 셋으로 나눴습니다
//
//    예전에는 isClosedDay() 하나가 전부를 뜻해서, 공휴일이면 우리 가게도
//    쉬는 것으로 계산됐습니다. 그래서 공휴일 전날 발주가 이유 없이 밀렸습니다.
//    (2026-08-16 일요일 발주가 화요일로 밀리는 문제)
//
//    실제로는 이렇습니다.
//      우리 가게    화요일만 휴무. 공휴일에도 정상 영업
//      고기 업체    화요일 + 공휴일(빨간날) 전부 휴무 → 납품 못 받음
//      식자재 업체   공휴일에도 일함 (예외는 업체가 알아서 처리, 우리는 신경 안 씀)
//
//    셋이 다르므로 이름을 나눕니다. 하나로 묶으면 또 같은 사고가 납니다.

function isHoliday(date) {
  const key = Utilities.formatDate(date, 'Asia/Seoul', 'yyyy-MM-dd');
  return HOLIDAYS_2026.indexOf(key) !== -1;
}

// 우리 가게가 쉬는 날
// ⚠️ 원당은 연중무휴입니다 (사장님 확인). 쉬는 날이 없습니다.
//    백석은 화요일 휴무라 여기서 true 가 나옵니다.
function isOurClosedDay(date) {
  return false;
}

// 고기 업체가 쉬는 날 — 화요일 + 공휴일. 이날은 납품을 못 받는다.
function isMeatVendorClosed(date) {
  return date.getDay() === 2 || isHoliday(date);
}

// 예전 이름. 다른 곳에서 부르고 있을 수 있어 남겨둔다 (고기 기준과 같음).
function isClosedDay(date) {
  return isMeatVendorClosed(date);
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  [v2.2] 영업일 개념 — 자정을 넘겨 발주해도 그 전날 영업분으로 본다
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//  ⚠️ 2026-08-18 사고
//     월요일 장사 마감이 늦어져 실제로는 화요일 00:35 에 발주를 넣으셨다.
//     코드는 "지금은 화요일이고 내일은 수요일(영업일)" 로 보고 즉시 발송해버렸다.
//     원래는 화요일 저녁에 모아서 보내야 했다.
//
//     가게는 자정을 넘겨 영업한다(라스트오더 23:30, 마감 00:00 무렵).
//     그래서 "달력상의 날"과 "장사하는 날"이 다르다. 이 함수가 그 차이를 메운다.
//
//  새벽 8시를 경계로 잡은 이유
//     마감 정리가 아무리 늦어도 새벽 8시를 넘기지는 않는다.
//     8시 이후에 넣는 발주는 그날 영업을 준비하며 넣는 것으로 본다.
//     (화면 쪽 food.html 의 getBusinessDate() 와 같은 기준이다. 어긋나면 안 된다.)
const BIZ_DAY_START_HOUR = 8;

// 지금이 어느 "영업일"인지 (새벽이면 전날)
function getBusinessDate(now) {
  const d = new Date(now);
  if (d.getHours() < BIZ_DAY_START_HOUR) d.setDate(d.getDate() - 1);
  return d;
}

// 영업일 기준으로 몇 시인지 — 새벽 0시 35분은 "전날 24시 35분" 으로 센다.
// 이걸 안 하면 "월요일인데 0시" 가 되어 시간 조건이 전부 무너진다.
function getBusinessHour(now) {
  const h = now.getHours();
  return h < BIZ_DAY_START_HOUR ? h + 24 : h;
}

// 이 발주를 화요일 저녁까지 모아뒀다가 보내야 하는가
//
//   영업일이 월요일   내일이 화요일(휴무)이라 납품을 못 받는다 → 수요일 납품용으로 모은다
//   영업일이 화요일   가게는 쉬지만 수요일 납품 발주를 넣는 날이다 → 저녁에 보낸다
//
// 화면(food.html)이 보내주는 delay_to_tuesday 값은 더 이상 믿지 않는다.
// 브라우저에 옛 화면이 캐시돼 있으면 틀린 값이 오기 때문이다. 서버가 직접 판단한다.
// ⚠️ 원당은 연중무휴라 미룰 일이 없습니다. 늘 즉시 발송합니다.
//    백석은 화요일 휴무라 월·화 발주를 화요일 20:30 으로 모읍니다.
//    ⚠️ 식자재 업체는 원당·백석이 같은 곳입니다. 업체 휴무는 그대로 지킵니다.
function shouldHoldUntilTuesday(now) {
  return false;
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ① HTML 반환
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function doGet(e) {
  return HtmlService
    .createHtmlOutputFromFile('index')
    .setTitle('백석점 발주·입고')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ② POST 수신
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.type === 'order')      return handleOrder(data);
    if (data.type === 'stock')      return handleStock(data);
    if (data.type === 'food_order') return handleFoodOrder(data); // [v2.0]
    return jsonResponse({ ok: false, message: '알 수 없는 type' });
  } catch (err) {
    console.log('doPost 오류: ' + err.message);
    return jsonResponse({ ok: false, message: err.message });
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ③ 고기 발주 처리
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function handleOrder(data) {
  const gcUse  = parseFloat(data.gc_use)  || 0;
  const gcDone = parseFloat(data.gc_done) || 0;
  const gcIng  = parseFloat(data.gc_ing)  || 0;
  const dc      = parseFloat(data.dc)      || 0;
  const mc      = parseFloat(data.mc)      || 0;
  const mcMax   = data.mc_max === true;
  const extras  = data.extras || [];

  const now       = new Date();

  // [v2.2] 달력상의 오늘이 아니라 "영업일" 로 판단한다.
  //        화요일 00:35 에 넣은 발주는 월요일 영업분이다. 위 getBusinessDate 설명 참고.
  const bizNow    = getBusinessDate(now);
  const dateStr   = formatDate(bizNow);
  const dayOfWeek = bizNow.getDay();

  // [v2.1 일반화] 화요일 고정휴무 + 공휴일을 모두 반영해서 서버가 직접
  // 지연발송 여부를 판단한다 (프론트가 보내는 monday_delay 값은 더 이상 사용 안 함 —
  // 예전엔 월요일일 때만 이 처리가 됐어서 다른 휴무일 전날 주문은 그냥 나가버렸음).
  const tomorrowCheck = new Date(bizNow);
  tomorrowCheck.setDate(bizNow.getDate() + 1);

  // [v2.2] 영업일이 화요일이면 내일(수요일)이 영업일이라도 저녁까지 모아둔다.
  //        화요일은 가게가 쉬는 날이라 낮에 넣은 발주도 저녁에 한 번에 보내는 게
  //        사장님이 쓰시던 방식이다. (식자재 20:30, 고기 20:00)
  // 고기는 업체 기준으로 본다 — 업체가 쉬면 납품을 못 받으므로 다음 영업일로 미룬다.
  const isMondayDelay = isMeatVendorClosed(tomorrowCheck) || isOurClosedDay(bizNow);

  const currentStock = gcUse + gcDone + gcIng;
  const target       = getTargetWithHoliday(now, dayOfWeek);
  const rawOrder     = target - currentStock;
  const calcOrder    = rawOrder <= 0 ? 0 : Math.round(rawOrder);
  const gcOrder      = Math.min(Math.max(calcOrder, CONFIG.BAESEOK.MIN_ORDER), CONFIG.BAESEOK.MAX_ORDER);

  console.log('발주계산 | 요일:' + dayOfWeek + ' 현재고:' + currentStock + ' 목표:' + target + ' 계산:' + calcOrder + ' 최종:' + gcOrder + ' 지연발송:' + isMondayDelay);

  logOrderToSheet(dateStr, gcUse, gcDone, gcIng, currentStock, target, gcOrder, dc, mc, extras, isMondayDelay);

  const orderParts = ['곱창 ' + gcOrder + '개'];
  if (dc > 0) orderParts.push('대창 ' + dc + '개');
  if (mcMax)       orderParts.push('막창 최대치');
  else if (mc > 0) orderParts.push('막창 ' + mc + '개');
  if (extras.length > 0) orderParts.push(extras.join(' · '));
  const orderSummary = orderParts.join(' / ');

  const baseTarget  = CONFIG.BAESEOK.TARGET_BY_DAY[dayOfWeek];
  const holidayNote = target > baseTarget ? ' (+1 연휴보정)' : '';
  const minNote     = gcOrder === CONFIG.BAESEOK.MIN_ORDER && calcOrder < CONFIG.BAESEOK.MIN_ORDER ? ' (최소' + CONFIG.BAESEOK.MIN_ORDER + '개 적용)' : '';
  const maxNote     = gcOrder === CONFIG.BAESEOK.MAX_ORDER && calcOrder > CONFIG.BAESEOK.MAX_ORDER ? ' (최대' + CONFIG.BAESEOK.MAX_ORDER + '개 적용)' : '';
  const bigoNote    = holidayNote + minNote + maxNote;

  if (isMondayDelay) {
    // [v2.1] 실제 발송 시점(마지막 휴무일 저녁 20시)을 계산 — 휴무일이
    // 연달아 겹쳐도(예: 공휴일+화요일) 정확한 다음 영업일까지 자동으로 건너뜀
    let deliveryDay = new Date(bizNow);
    deliveryDay.setDate(bizNow.getDate() + 1);
    while (isMeatVendorClosed(deliveryDay)) {
      deliveryDay.setDate(deliveryDay.getDate() + 1);
    }
    const sendDay = new Date(deliveryDay);
    sendDay.setDate(deliveryDay.getDate() - 1);
    sendDay.setHours(20, 0, 0, 0);

    const DOW_KR = ['일', '월', '화', '수', '목', '금', '토'];
    const sendDayLabel = DOW_KR[sendDay.getDay()] + '요일';

    // [v2.2] 예약 시각이 이미 지났으면 트리거를 걸 수 없다.
    //        예: 화요일 21시에 발주 → 화요일 20시는 이미 과거.
    //        이 경우 모아둘 이유가 없으므로 바로 보낸다.
    if (sendDay.getTime() <= now.getTime()) {
      console.log('예약 시각이 이미 지남 → 즉시 발송으로 전환 (' + sendDayLabel + ' 20:00)');
      const rn = sendAlimtalk(CONFIG.VENDOR_NUMBER, CONFIG.KAKAO.TEMPLATES.VENDOR_ORDER, {
        '날짜'     : dateStr,
        '발주요약' : orderSummary,
      });
      if (!rn.ok) {
        alertFailure('고기 발주 업체 발송 실패 (예약시각 경과분)', orderSummary, rn.error);
        return jsonResponse({ ok: false, gc_order: gcOrder, target: target, error: rn.error });
      }
      sendAlimtalk(CONFIG.OWNER_NUMBER, CONFIG.KAKAO.TEMPLATES.ORDER_REPORT, {
        '날짜'     : dateStr,
        '쓰는것'   : String(gcUse),
        '연육완료' : String(gcDone),
        '연육중'   : String(gcIng),
        '목표'     : String(target) + (bigoNote ? bigoNote : ''),
        '발주요약' : orderSummary + '\n▶ 예약시각이 지나 바로 발송했습니다',
      });
      return jsonResponse({ ok: true, gc_order: gcOrder, target: target });
    }

    const props = PropertiesService.getScriptProperties();
    props.setProperty('PENDING_MONDAY_ORDER', JSON.stringify({
      dateStr      : dateStr,
      orderSummary : orderSummary,
    }));

    ScriptApp.getProjectTriggers().forEach(function(t) {
      if (t.getHandlerFunction() === 'sendPendingMondayOrder') ScriptApp.deleteTrigger(t);
    });

    ScriptApp.newTrigger('sendPendingMondayOrder').timeBased().at(sendDay).create();

    console.log('휴무 감지 → 발주 예약 완료 → ' + sendDayLabel + ' 20:00 업체 발송 예정: ' + orderSummary);

    const rp = sendAlimtalk(CONFIG.OWNER_NUMBER, CONFIG.KAKAO.TEMPLATES.ORDER_REPORT, {
      '날짜'     : dateStr + ' ⏰예약',
      '쓰는것'   : String(gcUse),
      '연육완료' : String(gcDone),
      '연육중'   : String(gcIng),
      '목표'     : String(target) + (bigoNote ? bigoNote : ''),
      '발주요약' : orderSummary + '\n▶ ' + sendDayLabel + ' 20:00 업체 자동발송',
    });

    // 예약 자체는 저장됐으므로 실패해도 발주는 살아있다.
    // 다만 "예약됐다"는 확인을 못 받으신 상태이므로 알려드린다.
    if (!rp.ok) {
      alertFailure('발주 예약 확인 알림톡 실패 (예약 자체는 정상)',
                   orderSummary + ' → ' + sendDayLabel + ' 20:00 발송 예정', rp.error);
    }

    return jsonResponse({ ok: true, gc_order: gcOrder, target: target, scheduled: true });
  }

  const r1 = sendAlimtalk(CONFIG.OWNER_NUMBER, CONFIG.KAKAO.TEMPLATES.ORDER_REPORT, {
    '날짜'     : dateStr,
    '쓰는것'   : String(gcUse),
    '연육완료' : String(gcDone),
    '연육중'   : String(gcIng),
    '목표'     : String(target) + (bigoNote ? bigoNote : ''),
    '발주요약' : orderSummary,
  });

  const r2 = sendAlimtalk(CONFIG.VENDOR_NUMBER, CONFIG.KAKAO.TEMPLATES.VENDOR_ORDER, {
    '날짜'     : dateStr,
    '발주요약' : orderSummary,
  });

  // 업체 발송(r2)이 진짜다. 사장님 보고(r1)는 못 받아도 발주는 나가야 한다.
  if (!r2.ok) {
    alertFailure('고기 발주 업체 발송 실패', orderSummary, r2.error);
    return jsonResponse({ ok: false, gc_order: gcOrder, target: target, error: r2.error });
  }
  if (!r1.ok) {
    console.log('사장님 보고 알림톡만 실패 (업체 발송은 성공): ' + r1.error);
  }

  return jsonResponse({ ok: true, gc_order: gcOrder, target: target });
}


// ── 휴무일(화요일+공휴일) 20:00 고기 발주 트리거 [v2.1 일반화] ──
function sendPendingMondayOrder() {
  const props      = PropertiesService.getScriptProperties();
  const pendingStr = props.getProperty('PENDING_MONDAY_ORDER');
  if (!pendingStr) { console.log('예약된 발주 없음 → 종료'); return; }

  const pending = JSON.parse(pendingStr);
  props.deleteProperty('PENDING_MONDAY_ORDER');

  const r = sendAlimtalk(CONFIG.VENDOR_NUMBER, CONFIG.KAKAO.TEMPLATES.VENDOR_ORDER, {
    '날짜'     : pending.dateStr,
    '발주요약' : pending.orderSummary,
  });

  // 트리거는 성공·실패와 무관하게 정리한다 (안 지우면 다음 예약과 겹친다)
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'sendPendingMondayOrder') ScriptApp.deleteTrigger(t);
  });

  if (!r.ok) {
    // 예약 발송은 사장님이 화면을 보고 있지 않은 시각(20:00)에 돌아간다.
    // 여기서 놓치면 다음 날 고기가 안 들어온다.
    alertFailure('예약 고기 발주 업체 발송 실패', pending.orderSummary, r.error);
    return;
  }

  console.log('예약 발주 업체 발송 완료: ' + pending.orderSummary);
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ④ 입고 처리 (기존 그대로)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function handleStock(data) {
  const gc     = parseInt(data.gc)  || 0;
  const dc     = parseInt(data.dc)  || 0;
  const mc     = parseInt(data.mc)  || 0;
  const bs     = parseInt(data.bs)  || 0;
  const extras = data.extras || [];

  const dateStr = formatDate(new Date());
  logStockToSheet(dateStr, gc, dc, mc, bs, extras);

  const stockParts = [];
  if (gc > 0) stockParts.push('곱창 ' + gc + '개');
  if (dc > 0) stockParts.push('대창 ' + dc + '개');
  if (mc > 0) stockParts.push('막창 ' + mc + '개');
  if (bs > 0) stockParts.push('박스 ' + bs + '개');
  if (extras.length > 0) stockParts.push(extras.join(' · '));
  const stockSummary = stockParts.length > 0 ? stockParts.join(' / ') : '입고 없음';

  const stockVars = { '날짜': dateStr, '입고요약': stockSummary };
  const s1 = sendAlimtalk(CONFIG.OWNER_NUMBER,  CONFIG.KAKAO.TEMPLATES.STOCK_REPORT, stockVars);
  const s2 = sendAlimtalk(CONFIG.VENDOR_NUMBER, CONFIG.KAKAO.TEMPLATES.STOCK_REPORT, stockVars);

  if (!s1.ok || !s2.ok) {
    alertFailure('입고 알림 발송 실패', stockSummary, (s1.error || s2.error));
    return jsonResponse({ ok: false, error: (s1.error || s2.error) });
  }

  return jsonResponse({ ok: true });
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ⑤ [v2.0] 식자재 발주 처리
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function handleFoodOrder(data) {
  const msgs    = data.messages || [];
  const now     = new Date();
  const bizNow  = getBusinessDate(now);
  const dateStr = formatDate(bizNow);

  // [v2.2] 화면이 보내주는 delay_to_tuesday 를 그대로 믿지 않고 서버가 다시 판단한다.
  //
  //   왜 바꿨나 — 2026-08-18
  //     화면(food.html)이 날짜는 영업일로 보면서 시각은 실제 시계로 봤다.
  //     그래서 화요일 00:35 에 넣은 월요일 영업분 발주가 "월요일 0시" 로 판단되어
  //     즉시 발송으로 나가버렸다. 화요일 저녁에 나갔어야 했다.
  //
  //   화면도 같이 고쳤지만, 브라우저에 옛 화면이 캐시돼 있으면 또 틀린 값이 온다.
  //   고기 발주는 이미 서버가 직접 판단하고 있었다. 식자재도 같은 방식으로 맞춘다.
  const delayed  = shouldHoldUntilTuesday(now);
  const 화면판단  = data.delay_to_tuesday === true;
  if (delayed !== 화면판단) {
    console.log('⚠️ 화면과 서버 판단이 다름 → 서버 기준 적용 | 화면:' + 화면판단 +
                ' 서버:' + delayed + ' (영업일 ' + dateStr + ', 실제 ' + now + ')');
  }

  if (msgs.length === 0) return jsonResponse({ ok: false, message: '발주 항목 없음' });

  // 스프레드시트 기록 (즉시 / 예약 모두)
  logFoodOrderToSheet(dateStr, msgs, delayed);

  if (delayed && scheduleFoodTrigger(now)) {
    // 월·화 발주 → 화요일 20:30 예약
    savePendingFoodOrder(msgs, dateStr);

    console.log('식자재 발주 화요일 예약 완료: ' + dateStr);
    return jsonResponse({ ok: true, status: 'scheduled' });

  } else {
    // [v2.2] 예약 시각(화요일 20:30)이 이미 지났으면 모아둘 이유가 없다 → 즉시 발송
    // 즉시 발송
    const results = [];
    const 실패   = [];
    msgs.forEach(function(m) {
      const phone = (m.phone || CONFIG.FOOD.PHONES[m.supplier] || '').replace(/-/g, '');
      if (!phone) {
        console.log(m.supplier + ' 전화번호 없음 → skip');
        results.push({ supplier: m.supplier, ok: false, message: '전화번호 없음' });
        실패.push(m.supplier + ': 전화번호 없음');
        return;
      }
      const r = sendFoodSms(phone, m.body, m.channel);
      results.push({ supplier: m.supplier, ok: r.ok, channel: m.channel });
      if (!r.ok) 실패.push(m.supplier + ': ' + r.message);
    });

    if (실패.length) {
      alertFailure(
        '식자재 발주 발송 실패 (' + 실패.length + '/' + msgs.length + '건)',
        buildFoodOwnerSummary(msgs),
        실패.join(' / ')
      );
      return jsonResponse({ ok: false, results: results, failed: 실패 });
    }

    console.log('식자재 발주 즉시 발송 완료: ' + dateStr);
    return jsonResponse({ ok: true, results: results });
  }
}


// ── 화요일 20:30 식자재 트리거 설정 ──────────────────────────
// Returns: true = 예약 완료 / false = 예약 시각이 이미 지나 예약할 수 없음
function scheduleFoodTrigger(now) {
  // 기존 트리거 중복 제거
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'sendPendingFoodOrder') ScriptApp.deleteTrigger(t);
  });

  // [v2.2] 달력상의 오늘이 아니라 영업일 기준으로 화요일을 찾는다.
  //        화요일 00:35 은 월요일 영업분이므로 "다음 날(화요일) 20:30" 이 맞다.
  //        예전 코드는 now.getDay() 를 써서 이때 화요일(2)로 보고
  //        그날 20:30 으로 잡았는데, 그건 우연히 맞았을 뿐 의미가 달랐다.
  const bizNow      = getBusinessDate(now);
  const triggerTime = new Date(bizNow);
  if (bizNow.getDay() === 1) triggerTime.setDate(bizNow.getDate() + 1); // 월요일 영업분 → 화요일
  triggerTime.setHours(20, 30, 0, 0);

  // 예약 시각이 이미 지났으면 트리거를 걸 수 없다 (예: 화요일 21시 발주).
  if (triggerTime.getTime() <= now.getTime()) {
    console.log('식자재 예약 시각이 이미 지남 → 예약 불가 (' + triggerTime + ')');
    return false;
  }

  ScriptApp.newTrigger('sendPendingFoodOrder').timeBased().at(triggerTime).create();
  console.log('식자재 발주 트리거 설정: ' + triggerTime);
  return true;
}


// ── 식자재 예약 저장 ──────────────────────────────────────────
function savePendingFoodOrder(msgs, dateStr) {
  PropertiesService.getScriptProperties().setProperty(
    'PENDING_FOOD_ORDER',
    JSON.stringify({ msgs: msgs, dateStr: dateStr })
  );
}


// ── 화요일 20:30 자동 실행 (트리거 함수) ─────────────────────
function sendPendingFoodOrder() {
  const props = PropertiesService.getScriptProperties();
  const raw   = props.getProperty('PENDING_FOOD_ORDER');
  if (!raw) { console.log('예약된 식자재 발주 없음'); return; }

  const pending = JSON.parse(raw);
  props.deleteProperty('PENDING_FOOD_ORDER');

  const 실패 = [];
  pending.msgs.forEach(function(m) {
    const phone = (m.phone || CONFIG.FOOD.PHONES[m.supplier] || '').replace(/-/g, '');
    if (!phone) {
      console.log(m.supplier + ' 전화번호 없음 → skip');
      실패.push(m.supplier + ': 전화번호 없음');
      return;
    }
    const r = sendFoodSms(phone, m.body, m.channel);
    if (!r.ok) 실패.push(m.supplier + ': ' + r.message);
  });

  // 실행된 트리거 자체 삭제
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'sendPendingFoodOrder') ScriptApp.deleteTrigger(t);
  });

  if (실패.length) {
    // 업체별로 메일이 쏟아지지 않게 한 통으로 모아서 보낸다
    alertFailure(
      '예약 식자재 발주 발송 실패 (' + 실패.length + '/' + pending.msgs.length + '건)',
      buildFoodOwnerSummary(pending.msgs),
      실패.join(' / ')
    );
    return;
  }

  console.log('화요일 예약 식자재 발주 발송 완료');
}


// ── 식자재 채널별 발송 라우터 ─────────────────────────────────
function sendFoodSms(to, body, channel) {
  // KAKAO 채널은 알림톡 템플릿 없으므로 LMS로 대체
  if (channel === 'KAKAO') return sendSms(to, body, 'LMS');
  return sendSms(to, body, channel || 'SMS');
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ⑥ 목표재고 계산 / 공휴일 보정 (기존 그대로)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function getTargetWithHoliday(today, dayOfWeek) {
  const base = CONFIG.BAESEOK.TARGET_BY_DAY[dayOfWeek];
  if (checkUpcomingHoliday(today)) {
    console.log('공휴일 감지 → 목표재고 +1개 보정 (' + base + ' → ' + (base + 1) + ')');
    return base + 1;
  }
  return base;
}

function checkUpcomingHoliday(today) {
  if (CONFIG.HOLIDAY_API_KEY) {
    try {
      const year         = today.getFullYear();
      const month        = today.getMonth() + 1;
      const holidays     = getPublicHolidays(year, month);
      const nextMonth    = month === 12 ? 1 : month + 1;
      const nextYear     = month === 12 ? year + 1 : year;
      const holidaysNext = getPublicHolidays(nextYear, nextMonth);
      const all          = holidays.concat(holidaysNext);
      for (let i = 1; i <= 7; i++) {
        const d   = new Date(today);
        d.setDate(today.getDate() + i);
        const key = String(d.getFullYear()) +
          String(d.getMonth()+1).padStart(2,'0') +
          String(d.getDate()).padStart(2,'0');
        if (all.includes(key)) { console.log('공휴일 감지: ' + key); return true; }
      }
      return false;
    } catch (err) {
      console.log('공휴일 API 오류 → 주말 체크로 대체: ' + err.message);
    }
  }
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dow = tomorrow.getDay();
  return (dow === 5 || dow === 6);
}

function getPublicHolidays(year, month) {
  const url =
    'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo' +
    '?serviceKey=' + encodeURIComponent(CONFIG.HOLIDAY_API_KEY) +
    '&solYear=' + year +
    '&solMonth=' + String(month).padStart(2,'0') +
    '&_type=json&numOfRows=50';
  const res   = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const json  = JSON.parse(res.getContentText());
  const items = json?.response?.body?.items?.item;
  if (!items) return [];
  const list  = Array.isArray(items) ? items : [items];
  return list.map(function(item) { return String(item.locdate); });
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ⑦ 알림 트리거 (기존 그대로)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function sendOrderReminder() {
  const now       = new Date();
  const dayOfWeek = now.getDay();
  if (dayOfWeek === 6) { console.log('토요일 → 발주 알림 skip'); return; }
  if (dayOfWeek === 2) { console.log('화요일 (백석 휴무) → 발주 알림 skip'); return; }
  if (isTomorrowNoDelivery(now)) { console.log('내일 납품 없음 → 발주 알림 skip'); return; }

  const dateStr   = formatDate(now);
  const webAppUrl = ScriptApp.getService().getUrl();
  const r = sendAlimtalk(CONFIG.BAESEOK_ADMIN, CONFIG.KAKAO.TEMPLATES.ORDER_REMINDER, {
    '날짜' : dateStr,
    '링크' : webAppUrl,
  });
  // 알림이 안 오면 발주 자체를 잊어버린다. 이것도 알아야 한다.
  if (!r.ok) alertFailure('발주 알림 발송 실패', dateStr + ' 발주 알림', r.error);
}

function sendStockReminder() {
  const now       = new Date();
  const dayOfWeek = now.getDay();
  if (dayOfWeek === 6) { console.log('토요일 → 입고 알림 skip'); return; }
  if (isTomorrowNoDelivery(now)) { console.log('내일 납품 없음 → 입고 알림 skip'); return; }

  const dateStr   = formatDate(now);
  const webAppUrl = ScriptApp.getService().getUrl();
  const r = sendAlimtalk(CONFIG.BAESEOK_ADMIN, CONFIG.KAKAO.TEMPLATES.ORDER_REMINDER, {
    '날짜' : dateStr,
    '링크' : webAppUrl,
  });
  if (!r.ok) alertFailure('입고 알림 발송 실패', dateStr + ' 입고 알림', r.error);
}

function isTomorrowNoDelivery(today) {
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dow = tomorrow.getDay();
  if (dow === 0) return true;
  if (CONFIG.HOLIDAY_API_KEY) {
    try {
      const year     = tomorrow.getFullYear();
      const month    = tomorrow.getMonth() + 1;
      const holidays = getPublicHolidays(year, month);
      const key      = String(year) + String(month).padStart(2,'0') + String(tomorrow.getDate()).padStart(2,'0');
      if (holidays.includes(key)) { console.log('내일 공휴일: ' + key); return true; }
    } catch (err) { console.log('공휴일 API 오류: ' + err.message); }
  }
  return false;
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ⑧ Solapi 카카오 알림톡 발송 (기존 그대로)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// 반환값: { ok: true } 또는 { ok: false, error: '사유' }
//   예전에는 아무것도 돌려주지 않아서, 호출한 쪽이 실패를 알 방법이 없었다.
//   그래서 실패해도 다음 줄에서 "발송 완료" 를 찍어버렸다. (2026-08-11 사고)
//
function sendAlimtalk(to, templateId, variables) {
  if (!CONFIG.SOLAPI_API_KEY || !CONFIG.SOLAPI_API_SECRET) {
    return { ok: false, error: '솔라피 키 미설정 — 프로젝트 설정 > 스크립트 속성 확인' };
  }

  const date      = new Date().toISOString();
  const salt      = Utilities.getUuid();
  const signature = computeHmac(CONFIG.SOLAPI_API_SECRET, date + salt);

  const fv = {};
  Object.keys(variables).forEach(function(k) {
    fv[k.startsWith('#{') ? k : '#{' + k + '}'] = variables[k];
  });
  console.log('전송 변수: ' + JSON.stringify(fv));

  const payload = {
    message: {
      to           : to,
      from         : CONFIG.SENDER_NUMBER,
      kakaoOptions : {
        pfId       : CONFIG.KAKAO.PFID,
        templateId : templateId,
        variables  : fv,
      }
    }
  };

  try {
    const res = UrlFetchApp.fetch('https://api.solapi.com/messages/v4/send', {
      method             : 'post',
      contentType        : 'application/json',
      headers            : {
        'Authorization' : 'HMAC-SHA256 apiKey=' + CONFIG.SOLAPI_API_KEY + ', date=' + date + ', salt=' + salt + ', signature=' + signature
      },
      payload            : JSON.stringify(payload),
      muteHttpExceptions : true,
    });

    const result = JSON.parse(res.getContentText());
    if (result.errorCode) {
      console.log('알림톡 오류: ' + JSON.stringify(result));
      return { ok: false, error: (result.errorMessage || result.errorCode) };
    }
    console.log('알림톡 발송완료 → ' + to + ' | ' + templateId);
    return { ok: true };

  } catch (err) {
    console.log('알림톡 예외: ' + err.message);
    return { ok: false, error: err.message };
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ⑨ [v2.0] Solapi SMS / LMS 발송 (식자재 발주용)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function sendSms(to, text, type) {
  // type 미지정이면 바이트 수로 자동 판단
  if (!type) type = getByteLen(text) > CONFIG.FOOD.SMS_MAX_BYTES ? 'LMS' : 'SMS';

  const date = new Date().toISOString();
  const salt = Utilities.getUuid();
  const sig  = computeHmac(CONFIG.SOLAPI_API_SECRET, date + salt);

  const payload = {
    message: {
      to   : to.replace(/-/g, ''),
      from : CONFIG.SENDER_NUMBER,
      text : text,
      type : type,
    }
  };

  try {
    const res = UrlFetchApp.fetch('https://api.solapi.com/messages/v4/send', {
      method             : 'post',
      contentType        : 'application/json',
      headers            : {
        'Authorization' : 'HMAC-SHA256 apiKey=' + CONFIG.SOLAPI_API_KEY + ', date=' + date + ', salt=' + salt + ', signature=' + sig
      },
      payload            : JSON.stringify(payload),
      muteHttpExceptions : true,
    });
    const result = JSON.parse(res.getContentText());
    if (result.errorCode) {
      console.log('SMS 오류 [' + to + '] ' + JSON.stringify(result));
      return { ok: false, message: result.errorCode };
    }
    console.log('SMS 발송완료 → ' + to + ' (' + type + ')');
    return { ok: true };
  } catch (err) {
    console.log('SMS 예외: ' + err.message);
    return { ok: false, message: err.message };
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ⑩ 스프레드시트 기록
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function logOrderToSheet(dateStr, gcUse, gcDone, gcIng, total, target, gcOrder, dc, mc, extras, isMondayDelay) {
  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_ORDER) || ss.insertSheet(CONFIG.SHEET_ORDER);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['날짜','지점','쓰는것','연육완료','연육중','현재고','목표','발주(곱창)','대창','막창','추가주문','비고']);
  }
  const baseTarget  = CONFIG.BAESEOK.TARGET_BY_DAY[new Date().getDay()];
  const holidayNote = target > baseTarget ? '연휴보정' : '-';
  const delayNote   = isMondayDelay ? ' (휴무 지연발송)' : '';
  sheet.appendRow([dateStr,BRANCH,gcUse,gcDone,gcIng,total,target,gcOrder,dc,mc,extras.join(', '),holidayNote+delayNote]);
}

function logStockToSheet(dateStr, gc, dc, mc, bs, extras) {
  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_STOCK) || ss.insertSheet(CONFIG.SHEET_STOCK);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['날짜','지점','곱창 입고','대창 입고','막창 입고','박스 입고','기타']);
  }
  sheet.appendRow([dateStr,BRANCH,gc,dc,mc,bs,extras.join(', ')]);
}

// [v2.0] 식자재 발주 기록
function logFoodOrderToSheet(dateStr, msgs, delayed) {
  try {
    const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let sheet   = ss.getSheetByName(CONFIG.FOOD.SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.FOOD.SHEET_NAME);
      sheet.appendRow(['날짜', '지점', '업체', '발주항목', '채널', '즉시/예약']);
      sheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#ede9fe');
    }
    msgs.forEach(function(m) {
      sheet.appendRow([
        dateStr, BRANCH, m.supplier,
        (m.items ? m.items.join(', ') : m.body), m.channel,
        delayed ? '예약(화20:30)' : '즉시',
      ]);
    });
  } catch (err) {
    console.log('식자재 시트 기록 오류: ' + err.message);
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ⑪ 테스트 함수
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ★ 코드 교체 후 가장 먼저 실행 — 스크립트 속성에 키가 들어있는지 확인
function checkSolapiKeys() {
  const k = CONFIG.SOLAPI_API_KEY;
  const s = CONFIG.SOLAPI_API_SECRET;
  console.log('SOLAPI_API_KEY    : ' + (k ? '설정됨 (' + k.length + '자, 앞4자 ' + k.slice(0, 4) + ')' : '❌ 비어있음'));
  console.log('SOLAPI_API_SECRET : ' + (s ? '설정됨 (' + s.length + '자)' : '❌ 비어있음'));
  if (!k || !s) {
    console.log('\n👉 프로젝트 설정(⚙️) → 맨 아래 스크립트 속성 → 스크립트 속성 추가');
    console.log('   SOLAPI_API_KEY / SOLAPI_API_SECRET 두 개를 등록하세요.');
    return;
  }
  console.log('\n✅ 키 정상. testFailureAlert() 로 실패 알림도 확인해 보세요.');
}

// ★ 실패 알림이 실제로 오는지 테스트 (메일 1통 + 발송실패 시트 1줄)
function testFailureAlert() {
  alertFailure('테스트 알림', '곱창 2개 / 대창 1개 (테스트)', '이건 테스트입니다 — 무시하세요');
  console.log('→ ' + CONFIG.OWNER_EMAIL + ' 메일함과 「발송실패」 시트를 확인하세요.');
}

// 기존 — 카카오 알림톡 테스트
function testAlimtalk() {
  sendAlimtalk(CONFIG.OWNER_NUMBER, CONFIG.KAKAO.TEMPLATES.ORDER_REPORT, {
    '날짜'     : '26.04.26(토)',
    '쓰는것'   : '1.5',
    '연육완료' : '0.5',
    '연육중'   : '0.5',
    '목표'     : '3',
    '발주요약' : '곱창 2개 / 대창 1개',
  });
}

// 기존 — 예약 발주 테스트
function testMondayDelayOrder() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('PENDING_MONDAY_ORDER', JSON.stringify({
    dateStr      : formatDate(new Date()),
    orderSummary : '곱창 2개 (테스트)',
  }));
  console.log('테스트 예약 저장 완료 → sendPendingMondayOrder() 실행하여 확인');
}

// [v2.1] 휴무일 판정 테스트
function testIsClosedDay() {
  const d = new Date();
  console.log('오늘: ' + formatDate(d) + ' / 우리휴무:' + isOurClosedDay(d) + ' 고기업체휴무:' + isMeatVendorClosed(d));
  const t = new Date(d);
  t.setDate(d.getDate() + 1);
  console.log('내일: ' + formatDate(t) + ' / 우리휴무:' + isOurClosedDay(t) + ' 고기업체휴무:' + isMeatVendorClosed(t));
}

// [v2.0] 식자재 SMS 발송 테스트 (사장님 번호로)
function testFoodSms() {
  const r = sendSms(
    CONFIG.OWNER_NUMBER,
    '[테스트] 원당점 식자재발주\n미락: 양파 2, 부추 1\n네이버: 들기름, 쌀'
  );
  console.log('식자재 SMS 테스트 결과: ' + JSON.stringify(r));
}

// [v2.0] 식자재 화요일 예약 발송 시뮬레이션
function testFoodDelayOrder() {
  savePendingFoodOrder([
    { supplier:'미락',   items:['양파 2','부추 1'], body:'[백석점 발주 테스트]\n양파 2, 부추 1', channel:'SMS', phone:'' },
    { supplier:'네이버', items:['들기름','쌀'],     body:'[백석점 발주 테스트]\n들기름, 쌀',    channel:'SMS', phone:'' },
  ], formatDate(new Date()));
  console.log('식자재 예약 저장 완료 → sendPendingFoodOrder() 수동 실행으로 발송 테스트 가능');
}

// [v2.0] 예약 저장 내용 확인
function checkPendingFoodOrder() {
  const raw = PropertiesService.getScriptProperties().getProperty('PENDING_FOOD_ORDER');
  console.log(raw ? '저장된 식자재 발주: ' + raw : '저장된 식자재 발주 없음');
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ⑫ 유틸
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function buildFoodOwnerSummary(msgs) {
  return msgs.map(function(m) {
    return m.supplier + ': ' + (m.items ? m.items.join(', ') : m.body);
  }).join('\n');
}

// [v2.0] 바이트 길이 계산 (SMS 한글 90바이트 기준)
function getByteLen(str) {
  let n = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    n += c <= 0x7F ? 1 : c <= 0x7FF ? 2 : 3;
  }
  return n;
}

function computeHmac(secret, data) {
  const hash = Utilities.computeHmacSha256Signature(
    Utilities.newBlob(data).getBytes(),
    Utilities.newBlob(secret).getBytes()
  );
  return hash.map(function(b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

function formatDate(d) {
  const days = ['일','월','화','수','목','금','토'];
  return String(d.getFullYear()).slice(2) + '.' +
    String(d.getMonth()+1).padStart(2,'0') + '.' +
    String(d.getDate()).padStart(2,'0') + '(' + days[d.getDay()] + ')';
}

function pad(val, len) {
  let s = String(val);
  while (s.length < len) s = ' ' + s;
  return s;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

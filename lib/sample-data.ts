import type {
  Case,
  Comment,
  DocContent,
  FaqItem,
  OnboardingTask,
  PageStats,
  TeamMember,
  TreeNode,
  Verification,
  VerifyState,
  Version,
  WhatsNewItem,
} from "./types";

export const TEAM_MEMBERS: TeamMember[] = [
  { id: "u-kim", name: "김상담", initials: "김", color: "oklch(0.55 0.14 30)", role: "editor" },
  { id: "u-park", name: "박매니저", initials: "박", color: "oklch(0.55 0.14 240)", role: "reviewer" },
  { id: "u-lee", name: "이팀장", initials: "이", color: "oklch(0.55 0.14 145)", role: "admin" },
  { id: "u-choi", name: "최리더", initials: "최", color: "oklch(0.55 0.14 310)", role: "reviewer" },
  { id: "u-jung", name: "정인턴", initials: "정", color: "oklch(0.55 0.14 75)", role: "editor" },
];

export const ROLE_PERMISSIONS: Record<TeamMember["role"], string[]> = {
  admin: ["edit", "review", "approve", "publish"],
  reviewer: ["review", "approve"],
  editor: ["edit"],
  viewer: [],
};

export const ROLE_LABELS: Record<TeamMember["role"], { ko: string; en: string }> = {
  admin: { ko: "관리자", en: "Admin" },
  reviewer: { ko: "리뷰어", en: "Reviewer" },
  editor: { ko: "편집자", en: "Editor" },
  viewer: { ko: "읽기 전용", en: "Viewer" },
};

export const SAMPLE_COMMENTS: Record<string, Comment[]> = {
  "ch1-2-1": [
    {
      id: "cm-1",
      who: "박매니저",
      initials: "박",
      color: "oklch(0.55 0.14 240)",
      when: "3시간 전",
      body: "@김상담 톤 매트릭스 4번째 행 '슬픔·실망' 케이스 사례 더 추가 부탁드려요. 최근 응대 통화에서 비슷한 패턴이 자주 나오고 있어요.",
    },
    {
      id: "cm-2",
      who: "이팀장",
      initials: "이",
      color: "oklch(0.55 0.14 145)",
      when: "어제",
      body: "녹취 안내 부분은 법무팀 검토 끝났습니다. 그대로 진행해도 됩니다.",
      resolved: true,
    },
    {
      id: "cm-3",
      who: "김상담",
      initials: "김",
      color: "oklch(0.55 0.14 30)",
      when: "1주일 전",
      body: "결제 오류 스크립트의 변수 슬롯이 너무 정형적이지 않을지? 자연스럽게 다듬어야 할 것 같습니다.",
    },
  ],
  "ch2-1-1": [
    {
      id: "cm-4",
      who: "박매니저",
      initials: "박",
      color: "oklch(0.55 0.14 240)",
      when: "2일 전",
      body: "HEAR 단계 예시 멘트가 외부 자료보다 짧은데, 신입에게는 디테일이 더 도움이 될 거예요.",
    },
  ],
};

export const MUST_READ_IDS: ReadonlySet<string> = new Set([
  "ch2-1-4",
  "ch4-1-1",
  "ch1-2-1",
]);

export const WHATS_NEW: WhatsNewItem[] = [
  { id: "ch1-2-1", what: "톤 매트릭스 4행 추가", when: "2시간 전", who: "김상담", isNew: true },
  { id: "ch2-1-1", what: "HEAR 프레임워크 도식 추가", when: "어제", who: "박매니저", isNew: true },
  { id: "ch2-1-4", what: "보상 등급표 v1.4 개정", when: "1주일 전", who: "법무팀", isNew: false },
  { id: "ch4-1-1", what: "개인정보처리방침 v5.0 시행", when: "2026-02-01", who: "법무팀", isNew: false },
];

export const COMPLIANCE_RECORDS: Record<string, ReadonlySet<string>> = {
  "u-kim": new Set(["ch2-1-4", "ch1-2-1"]),
  "u-park": new Set(["ch2-1-4", "ch4-1-1", "ch1-2-1"]),
  "u-lee": new Set(["ch2-1-4", "ch4-1-1", "ch1-2-1"]),
  "u-choi": new Set(["ch4-1-1"]),
  "u-jung": new Set<string>(),
};

export const PAGE_STATS: Record<string, PageStats> = {
  "ch1-2-1": {
    views: 1842,
    copies: 387,
    searches: 92,
    helpful: 0.94,
    unhelpful: 0.06,
    hourly: [12, 8, 5, 3, 2, 4, 38, 82, 140, 180, 162, 148, 120, 135, 165, 168, 142, 98, 52, 38, 28, 22, 18, 14],
  },
  "ch1-1-1": { views: 1320, copies: 142, searches: 64, helpful: 0.91, unhelpful: 0.09 },
  "ch2-1-1": { views: 980, copies: 76, searches: 121, helpful: 0.88, unhelpful: 0.12 },
  "ch2-1-4": { views: 712, copies: 28, searches: 38, helpful: 0.86, unhelpful: 0.14 },
  "ch2-2-1": { views: 642, copies: 84, searches: 88, helpful: 0.93, unhelpful: 0.07 },
  "ch1-2-2": { views: 588, copies: 240, searches: 32, helpful: 0.96, unhelpful: 0.04 },
  "ch3-1-2": { views: 412, copies: 14, searches: 26, helpful: 0.84, unhelpful: 0.16 },
  "ch4-1-1": { views: 380, copies: 8, searches: 14, helpful: 0.78, unhelpful: 0.22 },
  "ch2-3-1": { views: 88, copies: 6, searches: 18, helpful: 0.62, unhelpful: 0.38 },
};

export const VERIFICATION: Record<string, Verification> = {
  "ch1-2-1": { lastVerified: 18, intervalDays: 90, by: "박매니저" },
  "ch1-1-1": { lastVerified: 45, intervalDays: 180, by: "이팀장" },
  "ch1-1-2": { lastVerified: 95, intervalDays: 90, by: "박매니저" },
  "ch2-1-1": { lastVerified: 72, intervalDays: 90, by: "박매니저" },
  "ch2-1-4": { lastVerified: 4, intervalDays: 180, by: "법무팀" },
  "ch3-1-2": { lastVerified: 220, intervalDays: 180, by: "운영팀" },
  "ch4-1-1": { lastVerified: 32, intervalDays: 365, by: "법무팀" },
  "ch4-1-2": { lastVerified: 60, intervalDays: 365, by: "법무팀" },
  "ch2-3-1": { lastVerified: 280, intervalDays: 180, by: "VIP팀" },
  "ch2-2-1": { lastVerified: 14, intervalDays: 90, by: "박매니저" },
};

export function verifyStatus(id: string): VerifyState | null {
  const v = VERIFICATION[id];
  if (!v) return null;
  const ratio = v.lastVerified / v.intervalDays;
  if (ratio < 0.7) return "fresh";
  if (ratio < 1.0) return "aging";
  return "stale";
}

export const CASES: Case[] = [
  {
    id: "C-2026-0142",
    title: "정기 결제 무단 인출 클레임 → 전액 환불 + 사과 화환",
    summary:
      "고객이 해지했다고 주장하는 정기 결제가 추가 인출됨. 시스템 로그상 해지 처리는 익일 자정 적용이어서 1회 추가 인출. 1차 진정 → 사실 확인 → 전액 환불 + 추가 1개월 무료 + 매니저 사과 통화로 마무리.",
    result: "good",
    date: "2026-03-12",
    duration: "32분",
    channel: "전화",
    agent: { name: "김상담", initials: "김", color: "oklch(0.55 0.14 30)" },
    linkedSection: "ch2-1-1",
    transcript: [
      { who: "고객", text: "이미 해지했는데 왜 또 결제됐어요? 이거 사기 아닙니까?" },
      { who: "상담사", text: "불편하셨을 것 같습니다. 결제 일자와 카드번호 끝 4자리 알려주시면 즉시 확인해 드리겠습니다." },
      { who: "고객", text: "5월 3일에 해지했는데 5월 4일 인출됐어요." },
      { who: "상담사", text: "확인 결과, 5월 3일 23시 47분 해지 접수는 정상이나, 정기 결제 컷오프 시각인 22시를 지나 익일 1회 인출이 발생했습니다." },
      { who: "상담사", text: "전액 즉시 환불해드리고, 사과의 의미로 1개월 무료를 적용해드릴게요." },
      { who: "고객", text: "...알겠습니다. 그렇게 해주세요." },
    ],
    lessons: [
      "정기 결제 해지 시 컷오프 시각을 안내하지 않으면 분쟁 발생",
      "'시스템 한계' 표현은 책임 회피로 들릴 수 있음 — 1차 안내 후 사용 자제",
      "추가 보상이 환불보다 사후 관계 회복에 효과적",
    ],
  },
  {
    id: "C-2026-0119",
    title: "장기 통화 후 클레임 — 응대 만족도 0점",
    summary:
      "단순 비밀번호 재설정 문의가 50분 통화로 이어짐. 시스템 점검 시간과 겹쳐 처리 지연, 상담사가 '잠시만요'를 12회 반복. 통화 종료 후 만족도 1점/5점, NPS 응답에서 '두번 다시 안 쓴다' 기재.",
    result: "bad",
    date: "2026-02-28",
    duration: "52분",
    channel: "전화",
    agent: { name: "정인턴", initials: "정", color: "oklch(0.55 0.14 75)" },
    linkedSection: "ch1-2-1",
    transcript: [
      { who: "고객", text: "비밀번호 재설정 메일이 안 와요." },
      { who: "상담사", text: "확인해드릴게요. 잠시만요." },
      { who: "상담사", text: "...잠시만요. 시스템이 좀 느리네요." },
      { who: "고객", text: "벌써 30분째인데요?" },
      { who: "상담사", text: "정말 죄송합니다. 잠시만요." },
    ],
    lessons: [
      "'잠시만요' 3회 이상 반복 시 반드시 콜백 옵션 안내",
      "시스템 점검 중일 때는 응대 매크로로 상태 안내 + 콜백 제안",
      "신규 상담사 멘토링 — 첫 30일 통화 모니터링 강화",
    ],
  },
  {
    id: "C-2026-0098",
    title: "VIP 고객 환불 거부 → 임원 개입 후 부분 환불 + 상품권",
    summary:
      "VIP 등급 고객이 단순 변심으로 환불 요청. 규정상 불가하지만 거래 누적 8천만원의 핵심 고객. 1차 응대에서 거부 → 항의 → 팀장 → 임원 결재로 50% 환불 + 30만원 상품권으로 합의.",
    result: "mixed",
    date: "2026-02-05",
    duration: "1시간 14분",
    channel: "전화 → 메일",
    agent: { name: "박매니저", initials: "박", color: "oklch(0.55 0.14 240)" },
    linkedSection: "ch2-3-1",
    transcript: [
      { who: "고객", text: "VIP인데 환불도 안 되나요?" },
      { who: "상담사", text: "단순 변심은 등급 관계없이 환불이 어렵습니다." },
      { who: "고객", text: "이런 식이면 다른 곳 쓰겠습니다." },
      { who: "상담사", text: "잠시만 양해 부탁드립니다. 팀장님께 사안 보고드리겠습니다." },
    ],
    lessons: [
      "VIP 응대 시 '규정상 불가'는 1차 후 사용 자제 — 즉시 에스컬레이션",
      "거래 누적 5천만원 이상은 팀장 결재로 예외 처리 권한 부여",
      "VIP 매뉴얼 2.3 보강 — 등급별 예외 한도 명시화",
    ],
  },
  {
    id: "C-2026-0067",
    title: "제품 안전 사고 추정 → 즉시 회수 + 의료비 선보전",
    summary:
      "고객 자녀가 제품 사용 중 손가락 부상. 결함 여부 불명확하나 안전 사고 우려로 D등급 적용. 24시간 내 의료비 선보전 100만원, 회수 후 전수 검사. 검사 결과 결함 없음으로 판명되었으나 회사 이미지 관점 적절 평가.",
    result: "good",
    date: "2026-01-22",
    duration: "5일",
    channel: "전화 → 방문",
    agent: { name: "이팀장", initials: "이", color: "oklch(0.55 0.14 145)" },
    linkedSection: "ch2-1-4",
    transcript: [
      { who: "고객", text: "아이가 다쳤어요. 제품에 문제가 있는 것 같습니다." },
      { who: "상담사", text: "정말 놀라셨겠습니다. 아이 상태가 어떤지부터 알려주세요." },
      { who: "상담사", text: "즉시 의료비를 선보전해드리겠습니다. 영수증 보내주시면 24시간 안에 입금됩니다." },
    ],
    lessons: [
      "안전 사고는 책임 소재 불명확해도 D등급 적용, 선조치 후 보고",
      "고객 자녀·노약자 부상 시 사과·공감이 사실 확인보다 우선",
      "추후 검사 결과가 회사에 유리해도 보상 환수 요구 금지",
    ],
  },
];

export const FAQ_LIST: FaqItem[] = [
  {
    q: "결제는 됐는데 주문 내역이 안 보여요. 어떻게 해야 하나요?",
    a: "주문 시점과 결제 카드사를 알려주시면 즉시 결제 상태를 확인해드리겠습니다. 결제는 정상 처리되었으나 시스템 동기화 지연으로 주문 내역 노출이 1~3분 지연될 수 있습니다.",
    confidence: 0.94,
    tags: ["결제", "주문"],
    askedCount: 412,
    sources: [
      { id: "ch1-2-1", confidence: 0.94, snippet: "결제 오류 — 1차 안내 스크립트" },
      { id: "ch3-1-2", confidence: 0.71, snippet: "티켓 생성·이관 절차" },
    ],
  },
  {
    q: "구매한 지 일주일 됐는데 환불 받을 수 있나요?",
    a: "구매한 지 7일 이내라면 단순 변심도 환불 가능합니다. 다만 제품을 개봉하셨다면 변심 환불은 50%이며 배송비는 고객 부담입니다. 하자가 있다면 전액 환불 + 배송비 회사 부담입니다.",
    confidence: 0.96,
    tags: ["환불", "교환"],
    askedCount: 387,
    sources: [
      { id: "ch1-2-1", confidence: 0.96, snippet: "응대 분기 가이드 — 환불 가능 여부" },
      { id: "ch2-2-1", confidence: 0.88, snippet: "환불 정책 요약표" },
    ],
  },
  {
    q: "배송이 너무 늦어요. 언제 도착하나요?",
    a: "운송장 번호로 즉시 추적해드리고, 예상 도착일을 다시 안내드리겠습니다. 배송 지연으로 불편을 끼쳐 죄송합니다.",
    confidence: 0.92,
    tags: ["배송"],
    askedCount: 298,
    sources: [
      { id: "ch1-2-1", confidence: 0.92, snippet: "배송 지연 — 사과 + 추적 스크립트" },
    ],
  },
  {
    q: "VIP 등급인데 환불이 안 된다고요?",
    a: "VIP 고객님께도 정중히 안내드리며, 사안에 따라 팀장 결재로 예외 처리가 가능합니다. 즉시 매니저에게 연결해드리겠습니다.",
    confidence: 0.68,
    tags: ["VIP", "환불"],
    askedCount: 47,
    sources: [
      { id: "ch2-3-1", confidence: 0.68, snippet: "VIP 등급 구분 (초안)" },
      { id: "ch2-2-1", confidence: 0.55, snippet: "환불 정책 요약표" },
    ],
  },
  {
    q: "개인정보가 어떻게 처리되나요?",
    a: "개인정보는 회원 식별·서비스 제공·민원 처리 목적으로만 사용되며, 회원 탈퇴 시까지 보관됩니다. 거래 기록은 전자상거래법에 따라 5년간 보관됩니다.",
    confidence: 0.98,
    tags: ["개인정보", "법무"],
    askedCount: 156,
    sources: [{ id: "ch4-1-1", confidence: 0.98, snippet: "개인정보처리방침 v5.0" }],
  },
  {
    q: "제품 사용 중 다쳤어요. 어떻게 처리되나요?",
    a: "정말 놀라셨겠습니다. 즉시 의료비 선보전 후 제품 회수·검사가 진행됩니다. 안전 관련 사고는 D등급으로 사안별 협의되며 24시간 내 1차 보상이 이뤄집니다.",
    confidence: 0.91,
    tags: ["안전사고", "보상"],
    askedCount: 18,
    sources: [
      { id: "ch2-1-4", confidence: 0.91, snippet: "보상 가이드라인 — D등급 적용" },
      { id: "ch2-1-1", confidence: 0.66, snippet: "1차 진정 단계" },
    ],
  },
  {
    q: "비밀번호 재설정 메일이 안 와요.",
    a: "스팸함을 먼저 확인 부탁드립니다. 5분 이상 지연되면 메일 서버 점검일 수 있어 지원팀에서 수동으로 재발송해드릴 수 있습니다.",
    confidence: 0.42,
    tags: ["계정", "비밀번호"],
    askedCount: 89,
    sources: [{ id: "ch3-1-1", confidence: 0.42, snippet: "로그인 및 기본 설정 (작성중)" }],
  },
];

export const ONBOARDING_TASKS: OnboardingTask[] = [
  {
    id: "ob-1",
    type: "read",
    title: "전화 응대 스크립트 정독",
    desc: "기본 톤·오프닝·종료 멘트와 톤 매트릭스를 학습합니다",
    sectionId: "ch1-2-1",
    estimate: "10분",
  },
  {
    id: "ob-2",
    type: "quiz",
    title: "응대 톤 매트릭스 퀴즈",
    desc: "고객 감정 상태별 올바른 어조와 피해야 할 표현",
    questions: [
      {
        q: "화·분노 상태의 고객에게 가장 피해야 할 표현은?",
        opts: ["진정하세요", "확인해드리겠습니다", "죄송합니다", "안내해드리겠습니다"],
        correct: 0,
        explain: "'진정하세요'는 고객 감정을 무시한다는 신호로 받아들여집니다.",
      },
      {
        q: "고객보다 먼저 끊지 말아야 하는 이유는?",
        opts: ["회사 규정", "법적 의무", "NPS 컴플레인 사유 1위", "녹취 시간 단축"],
        correct: 2,
        explain: "최근 NPS 조사에서 '먼저 끊김' 컴플레인이 12%→18%로 증가했습니다.",
      },
      {
        q: "오프닝 직후 반드시 안내해야 할 사항은?",
        opts: ["요금제 안내", "녹취 진행 안내", "프로모션 안내", "직원명"],
        correct: 1,
        explain: "개인정보보호법 제15조에 따라 오프닝 직후 즉시 녹취 안내가 필요합니다.",
      },
    ],
  },
  {
    id: "ob-3",
    type: "read",
    title: "클레임 응대 — 1차 진정 단계",
    desc: "HEAR 프레임워크와 피해야 할 표현",
    sectionId: "ch2-1-1",
    estimate: "8분",
  },
  {
    id: "ob-4",
    type: "quiz",
    title: "HEAR 프레임워크 퀴즈",
    questions: [
      {
        q: "HEAR 프레임워크에서 H는 무엇을 의미하나요?",
        opts: ["Hello (인사)", "Hold back (반응 보류)", "Help (도움)", "Hear (듣기)"],
        correct: 3,
        explain: "Hear — 끝까지 듣는 것이 시작입니다.",
      },
      {
        q: "클레임 응대 초반에 피해야 할 표현은?",
        opts: ["공감 표현", "사실 인정", "'규정상...' 변명", "끝까지 청취"],
        correct: 2,
        explain: "'규정상...'은 책임 회피로 받아들여지는 트리거 표현입니다.",
      },
    ],
  },
  {
    id: "ob-5",
    type: "read",
    title: "보상 가이드라인 (PDF) 확인",
    desc: "보상 등급 A~D와 결재 절차",
    sectionId: "ch2-1-4",
    estimate: "12분",
  },
  {
    id: "ob-6",
    type: "practice",
    title: "결정 트리 실습 — 환불 가능 여부",
    desc: "전화 응대 스크립트 페이지의 인터랙티브 가이드를 끝까지 진행해보세요",
    sectionId: "ch1-2-1",
    estimate: "5분",
  },
  {
    id: "ob-7",
    type: "read",
    title: "개인정보처리방침 숙지",
    desc: "법무팀 작성 — 정기 갱신 필수",
    sectionId: "ch4-1-1",
    estimate: "15분",
  },
];

export const SAMPLE_HISTORY: Record<string, Version[]> = {
  "ch1-2-1": [
    {
      id: "h-1",
      v: "v3.2",
      who: "김상담",
      when: "2시간 전",
      desc: "톤 매트릭스 4번째 행 추가",
      body: "",
    },
    {
      id: "h-2",
      v: "v3.1",
      who: "박매니저",
      when: "1일 전",
      desc: "녹취 안내 콜아웃 추가",
      body: "",
      tag: "approved",
    },
    {
      id: "h-3",
      v: "v3.0",
      who: "이팀장",
      when: "1주일 전",
      desc: "스크립트 카드 포맷 정비",
      body: "",
      tag: "published",
    },
  ],
};

export const SAMPLE_TREE: TreeNode[] = [
  {
    id: "ch1",
    label: "01. 고객응대 기본 원칙",
    labelEn: "01. CS Fundamentals",
    type: "chapter",
    open: true,
    status: "published",
    children: [
      {
        id: "ch1-1",
        label: "1.1 응대 철학과 행동강령",
        labelEn: "1.1 Philosophy & Code",
        type: "section",
        children: [
          { id: "ch1-1-1", label: "1.1.1 기본 매너 5원칙", labelEn: "1.1.1 Five basic manners", type: "item", status: "published" },
          { id: "ch1-1-2", label: "1.1.2 호칭 및 경어 가이드", labelEn: "1.1.2 Honorifics guide", type: "item", status: "published" },
          { id: "ch1-1-3", label: "1.1.3 금기어와 권장 표현", labelEn: "1.1.3 Forbidden vs preferred", type: "item", status: "review" },
        ],
      },
      {
        id: "ch1-2",
        label: "1.2 채널별 응대 표준",
        labelEn: "1.2 Channel standards",
        type: "section",
        open: true,
        children: [
          { id: "ch1-2-1", label: "1.2.1 전화 응대 스크립트", labelEn: "1.2.1 Phone scripts", type: "item", status: "published", hasComments: 3 },
          { id: "ch1-2-2", label: "1.2.2 이메일 응대 템플릿", labelEn: "1.2.2 Email templates", type: "item", status: "published" },
          { id: "ch1-2-3", label: "1.2.3 채팅 응대 가이드", labelEn: "1.2.3 Live chat guide", type: "item", status: "draft" },
        ],
      },
      {
        id: "ch1-3",
        label: "1.3 응대 품질 평가 기준",
        labelEn: "1.3 QA criteria",
        type: "section",
        children: [
          { id: "ch1-3-1", label: "1.3.1 모니터링 체크리스트", labelEn: "1.3.1 Monitoring checklist", type: "item", status: "approved" },
        ],
      },
    ],
  },
  {
    id: "ch2",
    label: "02. 상황별 응대 시나리오",
    labelEn: "02. Scenarios",
    type: "chapter",
    open: true,
    children: [
      {
        id: "ch2-1",
        label: "2.1 클레임 응대 프로세스",
        labelEn: "2.1 Complaint handling",
        type: "section",
        open: true,
        children: [
          { id: "ch2-1-1", label: "2.1.1 1차 진정 단계", labelEn: "2.1.1 De-escalation", type: "item", status: "published", hasComments: 1 },
          { id: "ch2-1-2", label: "2.1.2 문제 파악 인터뷰", labelEn: "2.1.2 Diagnostic interview", type: "item", status: "published" },
          { id: "ch2-1-3", label: "2.1.3 해결안 제시", labelEn: "2.1.3 Resolution offer", type: "item", status: "review" },
          { id: "ch2-1-4", label: "2.1.4 보상 가이드라인", labelEn: "2.1.4 Compensation guide", type: "item", status: "approved", badge: "PDF" },
        ],
      },
      {
        id: "ch2-2",
        label: "2.2 환불·교환 처리",
        labelEn: "2.2 Refund & exchange",
        type: "section",
        children: [
          { id: "ch2-2-1", label: "2.2.1 환불 정책 요약표", labelEn: "2.2.1 Refund policy", type: "item", status: "published" },
          { id: "ch2-2-2", label: "2.2.2 교환 절차 플로우", labelEn: "2.2.2 Exchange flow", type: "item", status: "draft" },
        ],
      },
      {
        id: "ch2-3",
        label: "2.3 VIP 고객 응대",
        labelEn: "2.3 VIP customers",
        type: "section",
        children: [
          { id: "ch2-3-1", label: "2.3.1 VIP 등급 구분", labelEn: "2.3.1 VIP tiers", type: "item", status: "draft" },
        ],
      },
    ],
  },
  {
    id: "ch3",
    label: "03. 시스템 및 도구 사용법",
    labelEn: "03. Systems & Tools",
    type: "chapter",
    children: [
      {
        id: "ch3-1",
        label: "3.1 CRM 시스템 가이드",
        labelEn: "3.1 CRM guide",
        type: "section",
        children: [
          { id: "ch3-1-1", label: "3.1.1 로그인 및 기본 설정", labelEn: "3.1.1 Login & setup", type: "item", status: "published" },
          { id: "ch3-1-2", label: "3.1.2 티켓 생성·이관", labelEn: "3.1.2 Ticket creation", type: "item", status: "review" },
        ],
      },
      {
        id: "ch3-2",
        label: "3.2 응대 보조 도구",
        labelEn: "3.2 Helper tools",
        type: "section",
        children: [
          { id: "ch3-2-1", label: "3.2.1 사내 위키 활용", labelEn: "3.2.1 Internal wiki", type: "item", status: "draft" },
          { id: "ch3-2-2", label: "3.2.2 응대 매크로 관리", labelEn: "3.2.2 Macro management", type: "item", status: "draft" },
        ],
      },
    ],
  },
  {
    id: "ch4",
    label: "04. 부록",
    labelEn: "04. Appendix",
    type: "chapter",
    children: [
      {
        id: "ch4-1",
        label: "4.1 약관 및 법적 고지",
        labelEn: "4.1 Terms & legal notices",
        type: "section",
        children: [
          { id: "ch4-1-1", label: "4.1.1 개인정보처리방침", labelEn: "4.1.1 Privacy policy", type: "item", status: "published", badge: "PDF" },
          { id: "ch4-1-2", label: "4.1.2 서비스 이용약관", labelEn: "4.1.2 Terms of service", type: "item", status: "published", badge: "PDF" },
        ],
      },
      {
        id: "ch4-2",
        label: "4.2 용어 사전",
        labelEn: "4.2 Glossary",
        type: "section",
        children: [
          { id: "ch4-2-1", label: "4.2.1 CS 표준 용어", labelEn: "4.2.1 Standard CS terms", type: "item", status: "published" },
        ],
      },
    ],
  },
];

export const SAMPLE_CONTENT: Record<string, DocContent> = {
  "ch1-2-1": {
    tags: ["응대 스크립트", "전화", "필수"],
    updated: "2시간 전",
    author: "김상담",
    version: "v3.2",
    body: `
<h2>전화 응대 스크립트</h2>
<p>전화 응대는 고객과의 <strong>첫 30초</strong>가 전체 인상을 결정합니다. 표준 인사부터 종료 멘트까지 일관된 톤을 유지하면서도, 고객의 감정 상태에 따라 적절히 어조를 조절해야 합니다.</p>

<div class="callout info">
  <div class="ico">i</div>
  <div class="body">
    <p>핵심 원칙</p>
    <p>"빠르고 정확한 응대"보다 "<strong>고객이 이해받고 있다는 느낌</strong>"이 우선입니다. 해결책이 즉시 없더라도 공감 표현으로 시작하세요.</p>
  </div>
</div>

<h3>1. 표준 오프닝 (수신)</h3>
<p>벨이 <strong>3회 이내</strong>에 받습니다. 다음 순서를 기억하세요.</p>
<ol>
  <li>인사 — "안녕하십니까, 고객행복센터 <em>OOO</em>입니다."</li>
  <li>고객 확인 — "<u>실례지만</u> 성함을 여쭤봐도 될까요?"</li>
  <li>용건 청취 — 끝까지 듣고, 핵심을 반복 확인합니다.</li>
</ol>

<h3>2. 톤 매트릭스</h3>
<table>
  <thead><tr><th>고객 상태</th><th>권장 어조</th><th>피해야 할 표현</th></tr></thead>
  <tbody>
    <tr><td>일반 문의</td><td>밝고 또렷한 어조</td><td>"음...", "잠시만요" 반복</td></tr>
    <tr><td>당황·불안</td><td>차분하고 안정적인 어조</td><td>"왜 그러셨어요?"</td></tr>
    <tr><td>화·분노</td><td>낮은 톤, 공감 표현 우선</td><td>"진정하세요", "규정상..."</td></tr>
    <tr><td>슬픔·실망</td><td>속도 늦춤, 침묵 허용</td><td>"별일 아니에요"</td></tr>
  </tbody>
</table>

<h3>3. 종료 체크리스트</h3>
<ul class="checklist">
  <li><input type="checkbox" checked />처리 결과 요약 (1문장)</li>
  <li><input type="checkbox" checked />다음 단계 안내 (있다면)</li>
  <li><input type="checkbox" />추가 문의 사항 확인</li>
  <li><input type="checkbox" />고객보다 먼저 끊지 않기</li>
</ul>

<div class="callout warn">
  <div class="ico">!</div>
  <div class="body">
    <p>주의 — 녹취 안내</p>
    <p>응대 품질 향상을 위한 녹취가 진행될 수 있음을 <strong>오프닝 직후 즉시</strong> 안내해야 합니다. (개인정보보호법 제15조)</p>
  </div>
</div>

<h3>4. 자주 쓰는 응대 스크립트</h3>
<div class="script-card">
  <div class="sc-hd">
    <span class="lbl">SCRIPT</span>
    <span>결제 오류 — 1차 안내</span>
    <span class="spacer"></span>
  </div>
  <div class="sc-body">안녕하십니까 <span class="var-slot">{고객명}</span>님, 고객행복센터 <span class="var-slot">{상담사명}</span>입니다.
확인이 가능한 정보로 결제 상태를 즉시 살펴보겠습니다.
거래 시각과 사용하신 카드사를 알려주시면 빠르게 확인 도와드리겠습니다.</div>
</div>
`,
  },
  "ch1-1-1": {
    tags: ["기본 매너", "신입 필독"],
    updated: "1주일 전",
    author: "이팀장",
    version: "v2.0",
    body: `
<h2>기본 매너 5원칙</h2>
<p>모든 응대의 출발점입니다. 채널·상황과 무관하게 항상 지켜야 합니다.</p>
<ol>
  <li><strong>경청</strong> — 고객이 말을 끝마치기 전에 끊지 않는다.</li>
  <li><strong>공감</strong> — "불편하셨겠어요" 같은 표현으로 감정을 먼저 받는다.</li>
  <li><strong>정확</strong> — 모르는 내용은 추측하지 않고 확인 후 회신.</li>
  <li><strong>책임</strong> — 다른 부서 이슈여도 "제가 확인해드리겠습니다"로 인계한다.</li>
  <li><strong>마무리</strong> — 처리 결과를 1문장으로 요약하고 추가 질문을 확인한다.</li>
</ol>
<div class="callout info">
  <div class="ico">i</div>
  <div class="body">
    <p>가장 흔한 실수</p>
    <p>고객보다 먼저 통화를 끊는 것 — 만족도 점수에 즉각적인 부정 영향을 줍니다.</p>
  </div>
</div>
`,
  },
  "ch2-1-1": {
    tags: ["클레임", "HEAR"],
    updated: "어제",
    author: "박매니저",
    version: "v1.4",
    body: `
<h2>1차 진정 단계 — HEAR 프레임워크</h2>
<p>화가 난 고객을 처음 만나는 단계에서는 <strong>해결보다 진정</strong>이 우선입니다.</p>
<table>
  <thead><tr><th>단계</th><th>의미</th><th>예시 멘트</th></tr></thead>
  <tbody>
    <tr><td>H — Hear</td><td>경청</td><td>"끝까지 듣겠습니다."</td></tr>
    <tr><td>E — Empathize</td><td>공감</td><td>"많이 불편하셨겠어요."</td></tr>
    <tr><td>A — Apologize</td><td>사과</td><td>"불편을 드려 죄송합니다."</td></tr>
    <tr><td>R — Resolve</td><td>해결</td><td>"지금 즉시 확인해서 알려드리겠습니다."</td></tr>
  </tbody>
</table>
`,
  },
};

export function defaultBody(label: string): string {
  return `<h2>${label}</h2><p class="text-ink-3">이 항목의 본문은 아직 작성되지 않았습니다. 우측 본문 영역에서 편집을 시작하세요.</p>`;
}

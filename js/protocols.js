// 제품별 복용 단계·식이 문구·출처. 임상 내용은 이 파일에만 둔다.
// 근거: 스펙 5.2(허가사항 원문), 5.3(식이 원칙: 허가사항 우선, 빈 곳만 저잔사식 보완), 5.4(문구 초안, 사용자 확정).

export const CLEAR_LIQUIDS =
  '물, 무색 이온음료, 보리차만 드세요. 우유, 과육이 있는 주스, 커피 크림, 붉은색 음료는 안 됩니다.';

export const LOW_RESIDUE = {
  ok: '흰죽·흰밥, 계란, 두부, 맑은 국, 살코기 소량, 껍질 벗긴 감자',
  avoid: '씨 있는 과일(키위·딸기·포도·토마토), 잡곡·현미, 해조류(김·미역), 나물·채소 섬유질, 견과류, 김치·깍두기, 붉은 고기 다량',
};

const LOW_RESIDUE_DETAIL = `권장: ${LOW_RESIDUE.ok}. 피할 음식: ${LOW_RESIDUE.avoid}.`;

// 쿨프렙: 1차·2차 동일 단계 (약학정보원 용법용량)
const COOLPREP_STEPS = [
  { minutes: 60, title: '조제 용액 1L 마시기', detail: '15분마다 250mL씩, 1시간에 걸쳐 천천히 마십니다.' },
  { minutes: 30, title: '물 500mL 마시기', detail: '이어서 30분 동안 물 500mL를 추가로 마십니다.' },
];

// 오라팡: 1차·2차 동일 단계 (식약처 허가사항)
const ORAPANG_STEPS = [
  { minutes: 30, title: '오라팡 14정 복용', detail: '물 425mL와 함께 1~2정씩 나누어 30분에 걸쳐 드세요.' },
  { minutes: 60, title: '물 425mL 두 번 더 마시기', detail: '1시간 동안 물 425mL를 두 차례 더 마십니다(총 850mL).' },
];

// 플렌뷰: 1차는 Dose 1, 2차는 Dose 2(A제+B제) (식약처 허가사항)
const PLENVU_DOSE1 = [
  { minutes: 30, title: 'Dose 1 용액 500mL 마시기', detail: 'Dose 1 파우치를 물에 녹여 500mL로 만든 뒤 30분 동안 마십니다.' },
  { minutes: 30, title: '물 500mL 마시기', detail: '이어서 30분 동안 물 500mL를 추가로 마십니다.' },
];
const PLENVU_DOSE2 = [
  { minutes: 30, title: 'Dose 2(A제+B제) 용액 500mL 마시기', detail: 'A제와 B제를 함께 물에 녹여 500mL로 만든 뒤 30분 동안 마십니다.' },
  { minutes: 30, title: '물 500mL 마시기', detail: '이어서 30분 동안 물 500mL를 추가로 마십니다.' },
];

export const PRODUCTS = {
  coolprep: {
    id: 'coolprep',
    name: '쿨프렙산',
    short: '쿨프렙',
    form: '2L 분말(PEG)',
    maxIntervalHours: null,
    doses: [COOLPREP_STEPS, COOLPREP_STEPS],
    diet: [
      { slot: 'breakfast', clock: '08:00', title: '아침: 저잔사식', detail: LOW_RESIDUE_DETAIL, basis: 'guide' },
      { slot: 'lunch', clock: '12:00', title: '점심: 저잔사식', detail: LOW_RESIDUE_DETAIL, basis: 'guide' },
      {
        slot: 'dinner',
        beforeDose1Min: 60,
        title: '저녁: 맑은 수프 등 가볍게 (이 시각까지)',
        detail: '고형 음식은 드시지 마세요. 1차 복용 1시간 전인 {deadline}까지 식사를 마치세요.',
        basis: 'label',
      },
    ],
    source: {
      label: '약학정보원 쿨프렙산 의약품정보',
      url: 'https://www.health.kr/searchDrug/result_drug.asp?drug_cd=2011080800002',
    },
  },

  orapang: {
    id: 'orapang',
    name: '오라팡정',
    short: '오라팡',
    form: '알약 28정(OSS)',
    maxIntervalHours: 12,
    doses: [ORAPANG_STEPS, ORAPANG_STEPS],
    diet: [
      {
        slot: 'breakfast',
        clock: '08:00',
        title: '아침: 가벼운 식사',
        detail: `가볍게 드세요. 이후에는 맑은 액체만 드실 수 있습니다. ${CLEAR_LIQUIDS}`,
        basis: 'label',
      },
      { slot: 'lunch', clock: '12:00', title: '점심: 맑은 액체만', detail: CLEAR_LIQUIDS, basis: 'label' },
    ],
    source: {
      label: '식약처 오라팡정 허가사항',
      url: 'https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=201902215',
    },
  },

  plenvu: {
    id: 'plenvu',
    name: '플렌뷰산',
    short: '플렌뷰',
    form: '1L 분말(PEG)',
    maxIntervalHours: null,
    doses: [PLENVU_DOSE1, PLENVU_DOSE2],
    diet: [
      {
        slot: 'breakfast',
        clock: '08:00',
        title: '아침: 유동식 등 가벼운 식사',
        detail: '죽·수프처럼 가볍게 드세요.',
        basis: 'label',
      },
      {
        slot: 'lunch',
        clock: '12:00',
        deadlineBeforeDose1Min: 180,
        title: '점심: 유동식 등 가벼운 식사',
        detail: `1차 복용 3시간 전인 {deadline}까지 마치세요. 이후 고형 음식은 드시지 말고 맑은 액체만 드세요. ${CLEAR_LIQUIDS}`,
        basis: 'label',
      },
    ],
    source: {
      label: '식약처 플렌뷰산 허가사항',
      url: 'https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=201905631',
    },
  },
};

export const PRODUCT_IDS = Object.keys(PRODUCTS);

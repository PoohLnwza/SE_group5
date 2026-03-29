'use client';

import { Box, Button, Container, Divider, Paper, Stack, Typography } from '@mui/material';
import {
  AssignmentRounded,
  CalendarMonthRounded,
  MedicalServicesRounded,
  PaymentRounded,
  PsychologyRounded,
  ReceiptLongRounded,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

/* ─── design tokens ──────────────────────────────────────────────────────────
 * Spacing: 4pt base → 4, 8, 12, 16, 24, 32, 48, 64, 96px
 * Typography: perfect-fourth 1.333 scale
 * Color: OKLCH — perceptually uniform, chroma drops at extremes
 *
 * 60-30-10 rule:
 *   60% — neutral warm surfaces (bg.default #ECE8DA, bg.paper #FCFAF3)
 *   30% — text + borders (text.primary #2F4A35, text.secondary #74856D)
 *   10% — primary green accent (CTAs, eyebrow, icons only)
 *
 * Alpha policy: explicit colours everywhere; alpha only for shadows
 * (shadows need colour bleed to look natural) and radial decorative overlays
 * (background is known, contrast is predictable).
 * ─────────────────────────────────────────────────────────────────────────── */

// Explicit OKLCH surface colours used in this page
// (matches theme.ts C tokens — no rgba alpha smells)
const HERO_BG = `linear-gradient(135deg,
  oklch(86% 0.05 147) 0%,
  oklch(92% 0.03 85)  52%,
  oklch(89% 0.04 135) 100%
)`;

const CTA_BG = `linear-gradient(135deg,
  oklch(90% 0.04 147) 0%,
  oklch(94% 0.025 85) 100%
)`;

const HERO_FONT    = 'clamp(2.8rem, 5vw + 1rem, 4.5rem)';
const SECTION_FONT = 'clamp(1.5rem, 3vw + 0.5rem, 2.2rem)';
const CTA_FONT     = 'clamp(1.8rem, 4vw + 0.5rem, 3rem)';
const LH_BODY      = 1.6;   // body rhythm
const LH_HEAD      = 1.08;  // tight for large display text
const MEASURE      = '62ch'; // optimal line length
const MEASURE_NARROW = '52ch';

const EYEBROW_SX = {
  fontSize: '0.75rem',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: 'primary.main',
  mb: 2,           // 16px — tight link to heading below
};

const SECTION_H2_SX = {
  fontSize: SECTION_FONT,
  fontWeight: 700,
  lineHeight: 1.18,
  letterSpacing: '-0.02em',
  mb: 1,           // 8px — close to subtitle
};

const SECTION_SUB_SX = {
  fontSize: '0.875rem',
  lineHeight: LH_BODY,
  color: 'text.secondary',
  maxWidth: MEASURE_NARROW,
};

/* services — kept as cards: visually comparable, distinct items in a grid */
const services = [
  {
    icon: <PsychologyRounded sx={{ fontSize: 28 }} />,
    title: 'จิตแพทย์เด็ก',
    desc: 'บางครั้งลูกแค่ต้องการคนที่เข้าใจจริงๆ ทีมจิตแพทย์ของเราพร้อมรับฟังและดูแลทั้งเด็กและครอบครัวอย่างใกล้ชิด',
  },
  {
    icon: <MedicalServicesRounded sx={{ fontSize: 28 }} />,
    title: 'นักจิตวิทยา',
    desc: 'ADHD ไม่ใช่ความผิดของลูก และไม่ใช่ความผิดของคุณด้วย นักจิตวิทยาของเราจะช่วยหาวิธีที่เหมาะกับลูกคนนั้นโดยเฉพาะ',
  },
  {
    icon: <AssignmentRounded sx={{ fontSize: 28 }} />,
    title: 'พยาบาลวิชาชีพ',
    desc: 'ทีมพยาบาลที่คอยติดตามอาการและอยู่เคียงข้างคุณในทุกขั้นตอน ถามได้เสมอ ไม่มีคำถามไหนเล็กเกินไป',
  },
];

/* features — no cards, grouping via icon + spacing + typography alone */
const features = [
  {
    icon: <CalendarMonthRounded />,
    title: 'จองนัดได้เองตอนไหนก็ได้',
    desc: 'ไม่ต้องรอโทรหาคลินิกในเวลาราชการ เลือกวันและเวลาที่สะดวกสำหรับคุณและลูกได้เลย',
  },
  {
    icon: <AssignmentRounded />,
    title: 'ติดตามพัฒนาการลูกได้ตลอด',
    desc: 'ดูว่าลูกเป็นอย่างไรบ้างในแต่ละครั้ง ผลการประเมิน บันทึกแพทย์ และยาที่ได้รับอยู่ในที่เดียว',
  },
  {
    icon: <PaymentRounded />,
    title: 'จ่ายเงินง่ายๆ ผ่าน PromptPay',
    desc: 'สแกน QR จ่ายได้เลย ไม่ต้องพกเงินสด ไม่ต้องรอต่อคิวชำระที่เคาน์เตอร์',
  },
  {
    icon: <ReceiptLongRounded />,
    title: 'ใบเสร็จพร้อมดาวน์โหลด',
    desc: 'พอจ่ายเสร็จก็ได้ใบเสร็จทันที บันทึกเป็น PDF เก็บไว้เบิกประกันหรืองานอื่นได้เลย',
  },
];

export default function LandingPage() {
  const router = useRouter();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>

      {/* ── Navbar: sticky, z above content ── */}
      <Box
        component="nav"
        sx={{
          px: { xs: 3, md: 6 },
          height: 56,                    // 4pt: 56 = 14×4
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          position: 'sticky',
          top: 0,
          zIndex: 100,                   // semantic: above page, below modals
        }}
      >
        <Typography sx={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.01em', color: 'primary.main' }}>
          Guardian Care
        </Typography>

        {/* touch-target: buttons have min-height 44px from MUI Large by default */}
        <Stack direction="row" gap={1}>
          <Button variant="text" size="small" onClick={() => router.push('/login')}>
            เข้าสู่ระบบ
          </Button>
          <Button variant="contained" size="small" onClick={() => router.push('/register')}>
            ลงทะเบียน
          </Button>
        </Stack>
      </Box>

      {/* ── Hero: size + weight + colour + 96px vertical breathing room ── */}
      <Box
        sx={{
          background: HERO_BG,
          pt: { xs: 12, md: 16 },       // 96–128px top — surrounded by white space = hierarchy
          pb: { xs: 12, md: 16 },
          px: { xs: 3, md: 6 },
          textAlign: 'center',
        }}
      >
        <Typography component="p" sx={{ ...EYEBROW_SX, mb: 3 }}>
          เราเข้าใจ · เราพร้อมช่วย
        </Typography>

        {/* headline: large + heavy + tight tracking = 3 hierarchy dimensions */}
        <Typography
          component="h1"
          sx={{
            fontSize: HERO_FONT,
            fontWeight: 800,
            lineHeight: LH_HEAD,
            letterSpacing: '-0.03em',
            mb: 3,                       // 24px — breathe before lead
            mx: 'auto',
            maxWidth: '16ch',
          }}
        >
          เลี้ยงลูกที่มี ADHD
          <br />
          ไม่ต้องสู้คนเดียว
        </Typography>

        {/* lead: smaller + regular weight + secondary colour — clear step down */}
        <Typography
          sx={{
            fontSize: '1.125rem',
            fontWeight: 400,
            lineHeight: LH_BODY,
            color: 'text.secondary',
            maxWidth: MEASURE,
            mx: 'auto',
            mb: 6,                       // 48px — generous gap before CTA
          }}
        >
          เราเป็นคลินิกจิตเวชเด็กที่เข้าใจว่าทุกวันของคุณไม่ง่าย
          ที่นี่คุณจะเจอทีมแพทย์ที่ฟัง ระบบที่ไม่ทำให้ชีวิตยุ่งยากขึ้น
          และการดูแลที่ออกแบบมาสำหรับลูกของคุณโดยเฉพาะ
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} justifyContent="center">
          <Button
            variant="contained" size="large"
            onClick={() => router.push('/register')}
            sx={{ px: 4, fontWeight: 700, minHeight: 48 }}
          >
            นัดพบแพทย์ครั้งแรก
          </Button>
          <Button
            variant="outlined" size="large"
            onClick={() => router.push('/login')}
            sx={{ px: 4, minHeight: 48 }}
          >
            เข้าสู่ระบบ
          </Button>
        </Stack>
      </Box>

      {/* ── Services: cards justified — comparable items needing visual boundary ── */}
      <Container maxWidth="lg" sx={{ py: { xs: 10, md: 14 } }}>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography component="p" sx={EYEBROW_SX}>ทีมของเรา</Typography>
          <Typography component="h2" sx={SECTION_H2_SX}>คนที่จะดูแลลูกของคุณ</Typography>
          <Typography sx={{ ...SECTION_SUB_SX, mx: 'auto', mt: 1.5 }}>
            ทุกคนในทีมผ่านการฝึกอบรมด้านเด็กและวัยรุ่นโดยเฉพาะ
            และเชื่อว่าการรักษาที่ดีเริ่มจากการฟังอย่างแท้จริง
          </Typography>
        </Box>

        {/* self-adjusting grid: ≥280px cols, no breakpoints needed */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 3,                      // 24px — 4pt scale
          }}
        >
          {services.map((s) => (
            <Paper
              key={s.title}
              elevation={0}
              sx={{
                p: 4,                    // 32px internal padding
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                textAlign: 'center',
                transition: 'box-shadow 0.18s, transform 0.18s',
                '&:hover': {
                  boxShadow: '0 4px 16px rgba(0,0,0,0.07)', // subtle — just visible
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <Box color="primary.main" mb={2}>{s.icon}</Box>
              <Typography component="h3" sx={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.01em', mb: 1 }}>
                {s.title}
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', lineHeight: LH_BODY, color: 'text.secondary' }}>
                {s.desc}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Container>

      <Divider />

      {/* ── Features: no cards — spacing + icon create grouping ── */}
      <Box sx={{ bgcolor: 'background.paper', py: { xs: 10, md: 14 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography component="p" sx={EYEBROW_SX}>ออกแบบมาเพื่อคุณ</Typography>
            <Typography component="h2" sx={SECTION_H2_SX}>เราลดงานให้คุณได้มากที่สุด</Typography>
            <Typography sx={{ ...SECTION_SUB_SX, mx: 'auto', mt: 1.5 }}>
              รู้ว่าผู้ปกครองมีภาระอยู่แล้วเยอะ ระบบนี้เลยออกแบบให้ง่ายที่สุด
              ใช้ได้จากมือถือ ไม่ต้องเรียนรู้นาน
            </Typography>
          </Box>

          {/* self-adjusting: 2-up on wide, 1-up on narrow — no breakpoints */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '40px 48px',          // row 40px, col 48px — variety creates hierarchy
            }}
          >
            {features.map((f) => (
              <Stack key={f.title} direction="row" gap={2} alignItems="flex-start">
                {/* icon box: colour + shape — secondary hierarchy anchor */}
                <Box
                  sx={{
                    p: 1.25,             // 10px — 4pt scale
                    borderRadius: 2,
                    bgcolor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    flexShrink: 0,
                    mt: '2px',           // optical alignment with first line of text
                  }}
                >
                  {f.icon}
                </Box>
                <Box>
                  {/* title: bold + base size — clear step above desc */}
                  <Typography component="h3" sx={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.3, mb: 0.5 }}>
                    {f.title}
                  </Typography>
                  {/* desc: sm + regular + secondary — lowest hierarchy */}
                  <Typography sx={{ fontSize: '0.875rem', lineHeight: LH_BODY, color: 'text.secondary' }}>
                    {f.desc}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Box>
        </Container>
      </Box>

      <Divider />

      {/* ── CTA: 96px vertical space + fluid heading — priority via isolation ── */}
      <Box
        sx={{
          py: { xs: 12, md: 16 },
          px: 3,
          textAlign: 'center',
          background: CTA_BG,
        }}
      >
        <Typography
          component="h2"
          sx={{
            fontSize: CTA_FONT,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            mb: 2,                       // 16px — tight to subtitle
          }}
        >
          ก้าวแรกยากที่สุด
          <br />
          แต่คุณไม่ต้องก้าวคนเดียว
        </Typography>
        <Typography
          sx={{
            fontSize: '1rem',
            lineHeight: LH_BODY,
            color: 'text.secondary',
            maxWidth: MEASURE,
            mx: 'auto',
            mb: 6,                       // 48px before CTA button
          }}
        >
          ลงทะเบียนเพื่อจองนัดครั้งแรก ใช้เวลาไม่ถึง 2 นาที
          แล้วปล่อยให้เราช่วยดูแลส่วนที่เหลือ
        </Typography>
        <Button
          variant="contained" size="large"
          onClick={() => router.push('/register')}
          sx={{ px: 5, fontWeight: 700, minHeight: 48 }}
        >
          เริ่มต้นเลย ฟรี
        </Button>
      </Box>

      {/* ── Footer ── */}
      <Box
        component="footer"
        sx={{
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          py: 3,
          textAlign: 'center',
        }}
      >
        <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled', letterSpacing: '0.02em' }}>
          © 2026 Guardian Care Clinic · คลินิกจิตเวชเด็กและวัยรุ่น
        </Typography>
      </Box>

    </Box>
  );
}

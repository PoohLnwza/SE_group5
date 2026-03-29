'use client';

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { formatDate, formatMoney } from '@/lib/format';

export type ReceiptData = {
  payment_id: number;
  payment_date: string;
  invoice_id: number;
  total_amount: number;
  child_name: string;
  visit_date: string | null;
  doctor_name: string | null;
  items: Array<{
    description: string;
    qty: number;
    unit_price: number;
    amount: number;
  }>;
};

type Props = {
  open: boolean;
  data: ReceiptData | null;
  onClose: () => void;
};

export function ReceiptDialog({ open, data, onClose }: Props) {
  const handleSavePdf = async () => {
    if (!data) return;
    const html2pdf = (await import('html2pdf.js')).default;
    const element = document.getElementById('receipt-content');
    if (!element) return;
    html2pdf()
      .set({
        margin: 10,
        filename: `receipt-${data.invoice_id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(element)
      .save();
  };

  if (!data) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogContent>
        <Box id="receipt-content" sx={{ p: 2, fontFamily: 'sans-serif' }}>
          {/* Header */}
          <Box textAlign="center" mb={2}>
            <Typography variant="h5" fontWeight={700}>Guardian Care Clinic</Typography>
            <Typography variant="body2" color="text.secondary">ใบเสร็จรับเงิน / Receipt</Typography>
          </Box>

          <Divider />

          {/* Info */}
          <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1} my={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">เลขที่ใบเสร็จ</Typography>
              <Typography variant="body2" fontWeight={600}>#{data.invoice_id}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">วันที่ชำระ</Typography>
              <Typography variant="body2" fontWeight={600}>{formatDate(data.payment_date)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">ชื่อผู้ป่วย</Typography>
              <Typography variant="body2" fontWeight={600}>{data.child_name}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">วันที่รับบริการ</Typography>
              <Typography variant="body2" fontWeight={600}>{data.visit_date ? formatDate(data.visit_date) : '-'}</Typography>
            </Box>
            {data.doctor_name && (
              <Box>
                <Typography variant="caption" color="text.secondary">แพทย์/นักจิตวิทยา</Typography>
                <Typography variant="body2" fontWeight={600}>{data.doctor_name}</Typography>
              </Box>
            )}
          </Box>

          <Divider />

          {/* Items */}
          <Table size="small" sx={{ my: 2 }}>
            <TableHead>
              <TableRow>
                <TableCell><Typography variant="caption" fontWeight={700}>รายการ</Typography></TableCell>
                <TableCell align="center"><Typography variant="caption" fontWeight={700}>จำนวน</Typography></TableCell>
                <TableCell align="right"><Typography variant="caption" fontWeight={700}>ราคา/หน่วย</Typography></TableCell>
                <TableCell align="right"><Typography variant="caption" fontWeight={700}>รวม</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.items.map((item, i) => (
                <TableRow key={i}>
                  <TableCell><Typography variant="caption">{item.description}</Typography></TableCell>
                  <TableCell align="center"><Typography variant="caption">{item.qty}</Typography></TableCell>
                  <TableCell align="right"><Typography variant="caption">{formatMoney(item.unit_price)}</Typography></TableCell>
                  <TableCell align="right"><Typography variant="caption">{formatMoney(item.amount)}</Typography></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Divider />

          {/* Total */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
            <Typography variant="body1" fontWeight={700}>ยอดรวมทั้งหมด</Typography>
            <Typography variant="h6" fontWeight={700} color="primary">{formatMoney(data.total_amount)}</Typography>
          </Box>

          <Box mt={2} p={1.5} bgcolor="success.50" borderRadius={1} textAlign="center">
            <Typography variant="body2" color="success.main" fontWeight={600}>ชำระเงินเรียบร้อยแล้ว</Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose}>ปิด</Button>
        <Button variant="outlined" onClick={handleSavePdf}>บันทึก PDF</Button>
      </DialogActions>
    </Dialog>
  );
}

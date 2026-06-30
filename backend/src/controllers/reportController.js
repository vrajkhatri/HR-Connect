import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import prisma from '../config/prisma.js';

async function reportRows() {
    return prisma.leaveRequest.findMany({
        include: {
            employee: {
                include: {
                    user: true,
                    department: true
                }
            },
            leaveType: true
        },
        orderBy: {
            appliedAt: 'desc'
        }
    });
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

export async function exportExcel(req, res) {
    const rows = await reportRows();

    const total = rows.length;
    const approved = rows.filter(r => r.status === 'APPROVED').length;
    const rejected = rows.filter(r => r.status === 'REJECTED').length;
    const pending = rows.filter(r => r.status === 'PENDING').length;

    const workbook = new ExcelJS.Workbook();

    workbook.creator = 'HRConnect';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Leave Report', {
        views: [
            {
                state: 'frozen',
                ySplit: 8
            }
        ]
    });

    sheet.mergeCells('A1:J1');
    sheet.getCell('A1').value = 'HRConnect Leave Management System';
    sheet.getCell('A1').font = {
        size: 18,
        bold: true,
        color: { argb: 'FFFFFFFF' }
    };
    sheet.getCell('A1').alignment = {
        horizontal: 'center'
    };
    sheet.getCell('A1').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1D4ED8' }
    };

    sheet.mergeCells('A2:J2');
    sheet.getCell('A2').value = 'Professional Employee Leave Report';
    sheet.getCell('A2').font = {
        size: 12,
        bold: true,
        color: { argb: 'FF334155' }
    };
    sheet.getCell('A2').alignment = {
        horizontal: 'center'
    };

    sheet.getCell('A4').value = 'Generated On';
    sheet.getCell('B4').value = formatDate(new Date());

    sheet.getCell('A5').value = 'Total Requests';
    sheet.getCell('B5').value = total;

    sheet.getCell('D5').value = 'Approved';
    sheet.getCell('E5').value = approved;

    sheet.getCell('G5').value = 'Rejected';
    sheet.getCell('H5').value = rejected;

    sheet.getCell('I5').value = 'Pending';
    sheet.getCell('J5').value = pending;

    ['A4', 'A5', 'D5', 'G5', 'I5'].forEach(cell => {
        sheet.getCell(cell).font = { bold: true };
    });

    const headerRow = sheet.getRow(8);

    headerRow.values = [
        'Employee Code',
        'Employee Name',
        'Department',
        'Leave Type',
        'Day Type',
        'Start Date',
        'End Date',
        'Days',
        'Status',
        'Reason'
    ];

    headerRow.height = 24;

    headerRow.eachCell(cell => {
        cell.font = {
            bold: true,
            color: { argb: 'FFFFFFFF' }
        };

        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0F172A' }
        };

        cell.alignment = {
            horizontal: 'center',
            vertical: 'middle'
        };

        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });

    rows.forEach((r, index) => {
        const row = sheet.addRow([
            r.employee.employeeCode,
            r.employee.user.name,
            r.employee.department?.name || '-',
            r.leaveType.name,
            r.dayType,
            formatDate(r.startDate),
            formatDate(r.endDate),
            r.daysCount,
            r.status,
            r.reason
        ]);

        row.eachCell(cell => {
            cell.alignment = {
                vertical: 'middle',
                wrapText: true
            };

            cell.border = {
                top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };

            if (index % 2 === 0) {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF8FAFC' }
                };
            }
        });

        const statusCell = row.getCell(9);

        if (r.status === 'APPROVED') {
            statusCell.font = {
                bold: true,
                color: { argb: 'FF15803D' }
            };
        } else if (r.status === 'REJECTED') {
            statusCell.font = {
                bold: true,
                color: { argb: 'FFB91C1C' }
            };
        } else {
            statusCell.font = {
                bold: true,
                color: { argb: 'FFD97706' }
            };
        }
    });

    sheet.columns = [
        { width: 16 },
        { width: 24 },
        { width: 20 },
        { width: 18 },
        { width: 16 },
        { width: 16 },
        { width: 16 },
        { width: 10 },
        { width: 14 },
        { width: 45 }
    ];

    sheet.autoFilter = {
        from: 'A8',
        to: 'J8'
    };

    res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    res.setHeader(
        'Content-Disposition',
        'attachment; filename=hrconnect_leave_report.xlsx'
    );

    await workbook.xlsx.write(res);
    res.end();
}

export async function exportPdf(req, res) {
    const rows = await reportRows();

    const total = rows.length;
    const approved = rows.filter(r => r.status === 'APPROVED').length;
    const rejected = rows.filter(r => r.status === 'REJECTED').length;
    const pending = rows.filter(r => r.status === 'PENDING').length;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
        'Content-Disposition',
        'attachment; filename=hrconnect_leave_report.pdf'
    );

    const doc = new PDFDocument({
        margin: 40,
        size: 'A4'
    });

    doc.pipe(res);

    doc
        .rect(0, 0, doc.page.width, 90)
        .fill('#1d4ed8');

    doc
        .fillColor('#ffffff')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('HRConnect', 40, 25);

    doc
        .fontSize(11)
        .font('Helvetica')
        .text('Employee Leave Management System', 40, 55);

    doc
        .fillColor('#ffffff')
        .fontSize(10)
        .text(`Generated: ${formatDate(new Date())}`, 400, 35);

    doc.moveDown(4);

    doc
        .fillColor('#0f172a')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('Leave Report Summary', 40, 115);

    const summaryY = 145;
    const cardWidth = 120;
    const cardHeight = 55;

    const cards = [
        ['Total', total, '#2563eb'],
        ['Approved', approved, '#16a34a'],
        ['Rejected', rejected, '#dc2626'],
        ['Pending', pending, '#f59e0b']
    ];

    cards.forEach((card, index) => {
        const x = 40 + index * 130;

        doc
            .roundedRect(x, summaryY, cardWidth, cardHeight, 8)
            .fill('#f8fafc')
            .stroke('#e2e8f0');

        doc
            .fillColor(card[2])
            .fontSize(18)
            .font('Helvetica-Bold')
            .text(String(card[1]), x + 12, summaryY + 10);

        doc
            .fillColor('#64748b')
            .fontSize(9)
            .font('Helvetica')
            .text(card[0], x + 12, summaryY + 33);
    });

    let y = 230;

    function drawTableHeader() {
        doc
            .rect(40, y, 520, 28)
            .fill('#0f172a');

        doc
            .fillColor('#ffffff')
            .fontSize(8)
            .font('Helvetica-Bold');

        doc.text('Employee', 48, y + 9, { width: 90 });
        doc.text('Leave Type', 140, y + 9, { width: 80 });
        doc.text('Day Type', 225, y + 9, { width: 75 });
        doc.text('Dates', 305, y + 9, { width: 85 });
        doc.text('Days', 395, y + 9, { width: 40 });
        doc.text('Status', 445, y + 9, { width: 70 });

        y += 28;
    }

    drawTableHeader();

    rows.forEach((r, index) => {
        if (y > 735) {
            doc.addPage();
            y = 50;
            drawTableHeader();
        }

        const rowHeight = 36;

        doc
            .rect(40, y, 520, rowHeight)
            .fill(index % 2 === 0 ? '#ffffff' : '#f8fafc')
            .stroke('#e2e8f0');

        doc
            .fillColor('#0f172a')
            .fontSize(8)
            .font('Helvetica');

        doc.text(
            `${r.employee.user.name}\n${r.employee.employeeCode}`,
            48,
            y + 7,
            { width: 88 }
        );

        doc.text(r.leaveType.name, 140, y + 12, { width: 80 });
        doc.text(r.dayType, 225, y + 12, { width: 75 });

        doc.text(
            `${formatDate(r.startDate)}\n${formatDate(r.endDate)}`,
            305,
            y + 7,
            { width: 85 }
        );

        doc.text(String(r.daysCount), 395, y + 12, { width: 40 });

        let statusColor = '#f59e0b';

        if (r.status === 'APPROVED') {
            statusColor = '#16a34a';
        }

        if (r.status === 'REJECTED') {
            statusColor = '#dc2626';
        }

        doc
            .roundedRect(445, y + 10, 65, 16, 4)
            .fill(statusColor);

        doc
            .fillColor('#ffffff')
            .fontSize(7)
            .font('Helvetica-Bold')
            .text(r.status, 451, y + 14, { width: 55 });

        y += rowHeight;
    });

    doc
        .fontSize(8)
        .fillColor('#64748b')
        .text(
            'Generated by HRConnect Leave Management System',
            40,
            doc.page.height - 40,
            { align: 'center' }
        );

    doc.end();
}
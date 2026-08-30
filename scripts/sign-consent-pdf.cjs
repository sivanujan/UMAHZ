#!/usr/bin/env node

/**
 * sign-consent-pdf.cjs
 * Appends an official, high-resolution execution & signature certificate page
 * to a consent PDF agreement using pdf-lib.
 */

const fs = require('fs');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

async function generateSignedPdf(payload) {
    const {
        templatePdfPath,
        outputPdfPath,
        clinicName = 'UMAHZ Clinic',
        consentTypeName = 'Informed Consent Agreement',
        signerName = 'Patient',
        signatureType = 'draw',
        signatureData = '',
        agreedAt = new Date().toISOString(),
        witnessedBy = 'Staff Witness',
        consentId = '',
        originalFileName = 'Consent Document.pdf',
        version = 1,
    } = payload;

    if (!fs.existsSync(templatePdfPath)) {
        throw new Error(`Template PDF not found at: ${templatePdfPath}`);
    }

    const existingPdfBytes = fs.readFileSync(templatePdfPath);

    // Idempotency check: if the PDF already contains this consent's Record UUID, it is already certified
    if (consentId && existingPdfBytes.includes(Buffer.from(`Record UUID: ${consentId}`))) {
        if (templatePdfPath !== outputPdfPath) {
            fs.copyFileSync(templatePdfPath, outputPdfPath);
        }
        return;
    }

    const pdfDoc = await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true });

    // Format date
    const dateObj = new Date(agreedAt);
    const formattedDate = dateObj.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
    });
    const dateOnly = dateObj.toISOString().split('T')[0];

    // Embed fonts
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // Create a new certificate page matching A4 portrait (595.28 x 841.89 pt)
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    // Color definitions
    const cPrimary = rgb(0.08, 0.12, 0.20);     // #141f33 (slate 900)
    const cText = rgb(0.20, 0.25, 0.33);        // #334155 (slate 700)
    const cMuted = rgb(0.40, 0.45, 0.55);       // #64748b (slate 500)
    const cBorder = rgb(0.85, 0.88, 0.92);      // #d8e0eb
    const cCardBg = rgb(0.97, 0.98, 0.99);      // #f8fafc
    const cGreen = rgb(0.06, 0.60, 0.40);       // #10b981
    const cGreenBg = rgb(0.92, 0.98, 0.95);

    let y = pageHeight - 50;

    // Top Header Banner
    page.drawText(clinicName.toUpperCase(), {
        x: 45,
        y: y,
        size: 14,
        font: helveticaBold,
        color: cPrimary,
    });
    y -= 16;

    page.drawText('OFFICIAL INFORMED CONSENT RECORD & EXECUTION CERTIFICATE', {
        x: 45,
        y: y,
        size: 8.5,
        font: helveticaBold,
        color: cMuted,
    });

    // Badge: VERIFIED & ACTIVE
    const badgeText = 'VERIFIED & ACTIVE';
    const badgeW = 110;
    const badgeH = 22;
    page.drawRectangle({
        x: pageWidth - 45 - badgeW,
        y: y - 4,
        width: badgeW,
        height: badgeH,
        color: cGreenBg,
        borderColor: cGreen,
        borderWidth: 1,
    });
    page.drawText(badgeText, {
        x: pageWidth - 45 - badgeW + 10,
        y: y + 3,
        size: 8,
        font: helveticaBold,
        color: cGreen,
    });

    y -= 25;

    // Divider Line
    page.drawLine({
        start: { x: 45, y: y },
        end: { x: pageWidth - 45, y: y },
        thickness: 1.5,
        color: cPrimary,
    });

    y -= 20;

    // Record Metadata Card (Gray Box)
    const cardHeight = 82;
    page.drawRectangle({
        x: 45,
        y: y - cardHeight,
        width: pageWidth - 90,
        height: cardHeight,
        color: cCardBg,
        borderColor: cBorder,
        borderWidth: 1,
    });

    // Column 1
    page.drawText('PATIENT / SIGNER FULL NAME', { x: 60, y: y - 18, size: 7.5, font: helveticaBold, color: cMuted });
    page.drawText(signerName, { x: 60, y: y - 32, size: 11, font: helveticaBold, color: cPrimary });

    page.drawText('DATE & TIME EXECUTED', { x: 60, y: y - 52, size: 7.5, font: helveticaBold, color: cMuted });
    page.drawText(formattedDate, { x: 60, y: y - 66, size: 9, font: helvetica, color: cText });

    // Column 2
    const col2X = 310;
    page.drawText('AGREEMENT DOCUMENT TYPE', { x: col2X, y: y - 18, size: 7.5, font: helveticaBold, color: cMuted });
    page.drawText(`${consentTypeName} (v${version})`, { x: col2X, y: y - 32, size: 10.5, font: helveticaBold, color: cPrimary });

    page.drawText('WITNESSED / RECORDED BY', { x: col2X, y: y - 52, size: 7.5, font: helveticaBold, color: cMuted });
    page.drawText(`${witnessedBy} (Authorized Staff)`, { x: col2X, y: y - 66, size: 9, font: helvetica, color: cText });

    y -= (cardHeight + 25);

    // Section 1: Attached Document Audit Details
    page.drawText('1. ATTACHED INFORMED CONSENT DOCUMENT VERIFICATION', {
        x: 45,
        y: y,
        size: 9,
        font: helveticaBold,
        color: cPrimary,
    });
    y -= 14;

    const auditNotice =
        `This certified execution sheet is an integral part of the informed consent record. The patient reviewed ` +
        `and agreed to the exact attached PDF document "${originalFileName}" (Version ${version}), which precedes ` +
        `this page. This complete document record is archived under immutable record UUID: ${consentId}.`;

    page.drawText(auditNotice, {
        x: 45,
        y: y,
        size: 8.5,
        font: helvetica,
        color: cText,
        maxWidth: pageWidth - 90,
        lineHeight: 12,
    });

    y -= 38;

    // Section 2: Patient Affirmation
    page.drawText('2. PATIENT LEGAL AFFIRMATION & ELECTRONIC ACKNOWLEDGMENT', {
        x: 45,
        y: y,
        size: 9,
        font: helveticaBold,
        color: cPrimary,
    });
    y -= 14;

    const affirmationNotice =
        `"I, ${signerName}, hereby certify that I have read, understand, and voluntarily agree to the complete ` +
        `terms and conditions set forth in this consent agreement. I understand the procedures, risks, and ` +
        `responsibilities described herein, and I confirm that my digital signature below represents my legal agreement."`;

    page.drawText(affirmationNotice, {
        x: 45,
        y: y,
        size: 8.5,
        font: helveticaOblique,
        color: cText,
        maxWidth: pageWidth - 90,
        lineHeight: 12,
    });

    y -= 50;

    // Section 3: Signature Execution Block
    page.drawText('3. SIGNATURE & ATTESTATION', {
        x: 45,
        y: y,
        size: 9,
        font: helveticaBold,
        color: cPrimary,
    });
    y -= 15;

    // Draw Signature Box for Client
    const sigBoxW = 230;
    const sigBoxH = 80;
    page.drawRectangle({
        x: 45,
        y: y - sigBoxH,
        width: sigBoxW,
        height: sigBoxH,
        color: rgb(1, 1, 1),
        borderColor: cBorder,
        borderWidth: 1,
    });

    // Embed client signature if draw mode
    if (signatureType === 'draw' && signatureData && signatureData.startsWith('data:image')) {
        try {
            const base64Data = signatureData.replace(/^data:image\/\w+;base64,/, '');
            const imageBytes = Buffer.from(base64Data, 'base64');
            const pngImage = await pdfDoc.embedPng(imageBytes);

            // Scale to fit nicely inside the box
            const maxW = sigBoxW - 20;
            const maxH = sigBoxH - 20;
            const dims = pngImage.scaleToFit(maxW, maxH);

            page.drawImage(pngImage, {
                x: 45 + (sigBoxW - dims.width) / 2,
                y: y - sigBoxH + (sigBoxH - dims.height) / 2,
                width: dims.width,
                height: dims.height,
            });
        } catch (err) {
            console.error('Warning: could not embed signature PNG:', err.message);
            page.drawText(`/s/ ${signerName}`, {
                x: 60,
                y: y - sigBoxH + 30,
                size: 16,
                font: helveticaOblique,
                color: cPrimary,
            });
        }
    } else {
        page.drawText(`/s/ ${signerName}`, {
            x: 60,
            y: y - sigBoxH + 30,
            size: 16,
            font: helveticaOblique,
            color: cPrimary,
        });
    }

    // Witness Signature Box
    const witnessBoxX = 310;
    page.drawRectangle({
        x: witnessBoxX,
        y: y - sigBoxH,
        width: sigBoxW,
        height: sigBoxH,
        color: rgb(1, 1, 1),
        borderColor: cBorder,
        borderWidth: 1,
    });

    page.drawText(`/s/ ${witnessedBy}`, {
        x: witnessBoxX + 15,
        y: y - sigBoxH + 30,
        size: 14,
        font: helveticaOblique,
        color: cPrimary,
    });

    y -= (sigBoxH + 10);

    // Client signature caption
    page.drawLine({
        start: { x: 45, y: y },
        end: { x: 45 + sigBoxW, y: y },
        thickness: 1,
        color: cPrimary,
    });
    page.drawText(signerName, { x: 45, y: y - 12, size: 9, font: helveticaBold, color: cPrimary });
    page.drawText(`Patient Signature • Executed ${dateOnly}`, { x: 45, y: y - 24, size: 8, font: helvetica, color: cMuted });

    // Witness signature caption
    page.drawLine({
        start: { x: witnessBoxX, y: y },
        end: { x: witnessBoxX + sigBoxW, y: y },
        thickness: 1,
        color: cPrimary,
    });
    page.drawText(witnessedBy, { x: witnessBoxX, y: y - 12, size: 9, font: helveticaBold, color: cPrimary });
    page.drawText(`Authorized Clinical Witness • ${dateOnly}`, { x: witnessBoxX, y: y - 24, size: 8, font: helvetica, color: cMuted });

    y -= 50;

    // Security & Compliance Bar at Bottom
    page.drawLine({
        start: { x: 45, y: 55 },
        end: { x: pageWidth - 45, y: 55 },
        thickness: 0.75,
        color: cBorder,
    });

    page.drawText('Official Medical Record • UMAHZ Practice Management • Immutable Storage', {
        x: 45,
        y: 40,
        size: 7.5,
        font: helvetica,
        color: cMuted,
    });

    page.drawText(`Record UUID: ${consentId}`, {
        x: pageWidth - 45 - 190,
        y: 40,
        size: 7.5,
        font: helveticaBold,
        color: cMuted,
    });

    const modifiedPdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPdfPath, modifiedPdfBytes);
}

// CLI Execution: reads JSON payload from process.argv[2] or stdin
async function main() {
    let rawInput = '';

    if (process.argv[2]) {
        rawInput = process.argv[2];
    } else {
        rawInput = fs.readFileSync(0, 'utf-8');
    }

    try {
        const payload = JSON.parse(rawInput);
        await generateSignedPdf(payload);
        console.log(JSON.stringify({ success: true, outputPath: payload.outputPdfPath }));
    } catch (err) {
        console.error(JSON.stringify({ success: false, error: err.message }));
        process.exit(1);
    }
}

main();

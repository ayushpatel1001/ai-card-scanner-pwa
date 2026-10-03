import type { RawExtractedCard } from './openrouter';

/**
 * Creates high-fidelity synthetic business card images on HTML5 canvas
 * for instant testing without requiring camera snapshots or API keys
 */
export function generateSampleMultiCardImage(): Promise<{ dataUri: string; file: File; cards: RawExtractedCard[] }> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1100;
    const ctx = canvas.getContext('2d')!;

    // Draw realistic conference desk surface (rich textured background)
    const deskGrad = ctx.createLinearGradient(0, 0, 1600, 1100);
    deskGrad.addColorStop(0, '#1c1f26');
    deskGrad.addColorStop(0.5, '#242933');
    deskGrad.addColorStop(1, '#1a1d24');
    ctx.fillStyle = deskGrad;
    ctx.fillRect(0, 0, 1600, 1100);

    // Subtle table grain / light reflection
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let i = 0; i < 1100; i += 8) {
      ctx.fillRect(0, i, 1600, 2);
    }

    // --- CARD 1 (Top Left): "Dr. Aris Thorne - QuantumSynthetics" ---
    // Normalized bounds: ymin: 0.12, xmin: 0.08, ymax: 0.52, xmax: 0.52
    // Canvas px: x: 128, y: 132, w: 704, h: 440
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 28;
    ctx.shadowOffsetX = 8;
    ctx.shadowOffsetY = 16;

    // Card 1 background: sleek dark indigo tech card
    const card1Grad = ctx.createLinearGradient(128, 132, 832, 572);
    card1Grad.addColorStop(0, '#0f172a');
    card1Grad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = card1Grad;
    ctx.beginPath();
    ctx.roundRect(128, 132, 704, 440, 14);
    ctx.fill();

    // Subtle card border
    ctx.strokeStyle = 'rgba(129, 140, 248, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Card 1 Accent geometric mark
    ctx.fillStyle = '#6366f1';
    ctx.beginPath();
    ctx.arc(180, 190, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a5b4fc';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('QS', 167, 198);

    // Card 1 Company
    ctx.fillStyle = '#818cf8';
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('QUANTUM SYNTHETICS LABS', 220, 195);

    // Card 1 Name
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Dr. Aris Thorne', 170, 290);

    // Card 1 Title
    ctx.fillStyle = '#38bdf8';
    ctx.font = '500 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Chief Research Scientist & Founder', 170, 325);

    // Card 1 Contact Details
    ctx.fillStyle = '#94a3b8';
    ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('📞  +1 (415) 890-2341', 170, 385);
    ctx.fillText('✉️  aris.thorne@quantumsynth.ai', 170, 420);
    ctx.fillText('🌐  https://quantumsynth.ai', 170, 455);
    ctx.fillText('📍  500 Howard St, Suite 700, San Francisco, CA', 170, 490);

    // --- CARD 2 (Bottom Right): "Elena Rostova - Studio Lumina" ---
    // Normalized bounds: ymin: 0.54, xmin: 0.50, ymax: 0.94, xmax: 0.94
    // Canvas px: x: 800, y: 594, w: 704, h: 440
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetX = 10;
    ctx.shadowOffsetY = 18;

    // Card 2 background: elegant minimalist off-white card
    const card2Grad = ctx.createLinearGradient(800, 594, 1504, 1034);
    card2Grad.addColorStop(0, '#f8fafc');
    card2Grad.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = card2Grad;
    ctx.beginPath();
    ctx.roundRect(800, 594, 704, 440, 14);
    ctx.fill();

    // Subtle card border
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Card 2 Accent mark
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(850, 645, 12, 50);

    // Card 2 Company
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('STUDIO LUMINA DESIGN', 875, 680);

    // Card 2 Name
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Elena Rostova', 850, 785);

    // Card 2 Title
    ctx.fillStyle = '#e11d48';
    ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Principal Design Director', 850, 822);

    // Card 2 Contact Details
    ctx.fillStyle = '#475569';
    ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('📞  +1 (212) 555-0199', 850, 880);
    ctx.fillText('✉️  elena@studiolumina.co', 850, 915);
    ctx.fillText('🌐  https://studiolumina.co', 850, 950);
    ctx.fillText('📍   Soho Creative Hub, New York, NY 10013', 850, 985);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'sample_table_cards.jpg', { type: 'image/jpeg' });
      const dataUri = canvas.toDataURL('image/jpeg', 0.88);

      const cards: RawExtractedCard[] = [
        {
          full_name: 'Dr. Aris Thorne',
          first_name: 'Aris',
          last_name: 'Thorne',
          company: 'Quantum Synthetics Labs',
          designation: 'Chief Research Scientist & Founder',
          phones: [{ number: '+1 (415) 890-2341', type: 'CELL' }],
          emails: [{ email: 'aris.thorne@quantumsynth.ai', type: 'WORK' }],
          address: '500 Howard St, Suite 700, San Francisco, CA',
          websites: ['https://quantumsynth.ai'],
          notes: 'Met at AI Hardware Summit 2026. Specializes in photonics & neural processors.',
          box: {
            ymin: 132 / 1100, // ~0.12
            xmin: 128 / 1600, // ~0.08
            ymax: 572 / 1100, // ~0.52
            xmax: 832 / 1600, // ~0.52
          },
        },
        {
          full_name: 'Elena Rostova',
          first_name: 'Elena',
          last_name: 'Rostova',
          company: 'Studio Lumina Design',
          designation: 'Principal Design Director',
          phones: [{ number: '+1 (212) 555-0199', type: 'CELL' }],
          emails: [{ email: 'elena@studiolumina.co', type: 'WORK' }],
          address: 'Soho Creative Hub, New York, NY 10013',
          websites: ['https://studiolumina.co'],
          notes: 'Award-winning spatial product and brand identity designer.',
          box: {
            ymin: 594 / 1100, // ~0.54
            xmin: 800 / 1600, // ~0.50
            ymax: 1034 / 1100, // ~0.94
            xmax: 1504 / 1600, // ~0.94
          },
        },
      ];

      resolve({ dataUri, file, cards });
    }, 'image/jpeg', 0.88);
  });
}

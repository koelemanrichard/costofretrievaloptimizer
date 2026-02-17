import { describe, it, expect } from 'vitest';
import { OverlayService } from '../overlayService';

describe('OverlayService', () => {
  it('should mark topics with aligned pages as covered_aligned (green)', () => {
    const service = new OverlayService();
    const result = service.computeOverlay({
      topics: [{ id: 't1', title: 'CMS Benefits', type: 'core' }],
      inventory: [{
        id: 'inv1', url: '/cms-benefits', mapped_topic_id: 't1',
        ce_alignment: 85, sc_alignment: 80, csi_alignment: 75,
        gsc_clicks: 100, audit_score: 80,
      }],
    });
    expect(result[0].status).toBe('covered_aligned');
    expect(result[0].statusColor).toBe('green');
  });

  it('should mark topics with misaligned pages as covered_needs_work (yellow)', () => {
    const service = new OverlayService();
    const result = service.computeOverlay({
      topics: [{ id: 't1', title: 'CMS Benefits', type: 'core' }],
      inventory: [{
        id: 'inv1', url: '/cms-benefits', mapped_topic_id: 't1',
        ce_alignment: 40, sc_alignment: 30, csi_alignment: 50,
        gsc_clicks: 100, audit_score: 45,
      }],
    });
    expect(result[0].status).toBe('covered_needs_work');
    expect(result[0].statusColor).toBe('yellow');
  });

  it('should mark topics with no pages as gap (red)', () => {
    const service = new OverlayService();
    const result = service.computeOverlay({
      topics: [{ id: 't1', title: 'CMS Migration', type: 'core' }],
      inventory: [],
    });
    expect(result[0].status).toBe('gap');
    expect(result[0].statusColor).toBe('red');
  });

  it('should detect cannibalization when 2+ pages match same topic', () => {
    const service = new OverlayService();
    const result = service.computeOverlay({
      topics: [{ id: 't1', title: 'CMS Benefits', type: 'core' }],
      inventory: [
        { id: 'inv1', url: '/cms-benefits', mapped_topic_id: 't1', gsc_clicks: 100, audit_score: 80 },
        { id: 'inv2', url: '/cms-advantages', mapped_topic_id: 't1', gsc_clicks: 50, audit_score: 60 },
      ],
    });
    expect(result[0].status).toBe('cannibalization');
    expect(result[0].statusColor).toBe('orange');
    expect(result[0].matchedPages).toHaveLength(2);
  });

  it('should identify orphan pages not mapped to any topic', () => {
    const service = new OverlayService();
    const result = service.computeOverlay({
      topics: [{ id: 't1', title: 'CMS Benefits', type: 'core' }],
      inventory: [
        { id: 'inv1', url: '/cms-benefits', mapped_topic_id: 't1', gsc_clicks: 100 },
        { id: 'inv2', url: '/about-us', mapped_topic_id: null, gsc_clicks: 10 },
      ],
    });
    expect(result).toHaveLength(2);
    const orphanNode = result.find(n => n.status === 'orphan');
    expect(orphanNode).toBeDefined();
  });
});

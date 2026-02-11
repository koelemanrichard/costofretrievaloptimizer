import { describe, it, expect } from 'vitest';
import { getGscData, parseGscCsv } from '../gscService';
import type { GscDataSource } from '../gscService';

describe('GscDataSource', () => {
  it('CSV source type calls parseGscCsv and returns parsed rows', async () => {
    const source: GscDataSource = {
      type: 'csv',
      csvText: 'Top queries,Clicks,Impressions,CTR,Position\ntest keyword,10,100,10%,5.2',
    };
    const rows = await getGscData(source);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].query).toBe('test keyword');
    expect(rows[0].clicks).toBe(10);
    expect(rows[0].impressions).toBe(100);
    expect(rows[0].ctr).toBeCloseTo(0.1);
    expect(rows[0].position).toBeCloseTo(5.2);
  });

  it('CSV source with empty text rejects', async () => {
    const source: GscDataSource = {
      type: 'csv',
      csvText: '',
    };
    await expect(getGscData(source)).rejects.toThrow('CSV text is empty');
  });

  it('parseGscCsv is still exported and works independently', async () => {
    const rows = await parseGscCsv(
      'Top queries,Clicks,Impressions,CTR,Position\nseo tools,25,500,5%,3.1'
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].query).toBe('seo tools');
    expect(rows[0].clicks).toBe(25);
  });
});

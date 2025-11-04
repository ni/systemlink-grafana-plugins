import { buildCombinedFilter, buildResultIdFilter } from './utils';

describe('DataFrameDataSourceV2 Utils', () => {
    describe('buildCombinedFilter', () => {
        it('should build filter with only result IDs', () => {
            const result = buildCombinedFilter(['id1', 'id2', 'id3']);
            
            expect(result.isValid).toBe(true);
            expect(result.filter).toBe('new[] {@0, @1, @2}.Contains(testResultId)');
            expect(result.substitutions).toEqual(['id1', 'id2', 'id3']);
        });

        it('should build filter with result IDs and data table filter', () => {
            const result = buildCombinedFilter(
                ['id1', 'id2'],
                'name == "test"'
            );
            
            expect(result.isValid).toBe(true);
            expect(result.filter).toBe('new[] {@0, @1}.Contains(testResultId) && (name == "test")');
            expect(result.substitutions).toEqual(['id1', 'id2']);
        });

        it('should build filter with all three filters', () => {
            const result = buildCombinedFilter(
                ['id1'],
                'name == "test"',
                'name == "column1"'
            );
            
            expect(result.isValid).toBe(true);
            expect(result.filter).toContain('new[] {@0}.Contains(testResultId)');
            expect(result.filter).toContain('name == "test"');
            expect(result.filter).toContain('columns.Any(it.Name == "column1")');
            expect(result.substitutions).toEqual(['id1']);
        });

        it('should return empty filter when no inputs provided', () => {
            const result = buildCombinedFilter();
            
            expect(result.isValid).toBe(true);
            expect(result.filter).toBe('');
            expect(result.substitutions).toEqual([]);
        });

        it('should return error when filter exceeds max length', () => {
            const longResultIds = Array(5000).fill('very-long-result-id-string-12345');
            const result = buildCombinedFilter(longResultIds);
            
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toContain('exceeds maximum length');
        });

        it('should handle empty strings in filters', () => {
            const result = buildCombinedFilter(['id1'], '', '  ');
            
            expect(result.isValid).toBe(true);
            expect(result.filter).toBe('new[] {@0}.Contains(testResultId)');
        });
    });

    describe('buildResultIdFilter', () => {
        it('should build filter with result IDs', () => {
            const result = buildResultIdFilter(['id1', 'id2', 'id3']);
            
            expect(result.isValid).toBe(true);
            expect(result.filter).toBe('new[] {@0, @1, @2}.Contains(testResultId)');
            expect(result.substitutions).toEqual(['id1', 'id2', 'id3']);
        });

        it('should return empty filter for empty array', () => {
            const result = buildResultIdFilter([]);
            
            expect(result.isValid).toBe(true);
            expect(result.filter).toBe('');
            expect(result.substitutions).toEqual([]);
        });

        it('should return error when filter exceeds max length', () => {
            const longResultIds = Array(5000).fill('very-long-result-id-string-12345');
            const result = buildResultIdFilter(longResultIds);
            
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toContain('Too many result IDs');
        });
    });
});

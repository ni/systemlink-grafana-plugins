export interface AssetSummaryResponse {
    active: number;
    notActive: number;
    total: number;
    approachingRecommendedDueDate: number;
    pastRecommendedDueDate: number;
    outForCalibration: number;
}

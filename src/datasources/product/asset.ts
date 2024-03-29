/**
 * An interface that defines information about an asset calibration entry
 */
export interface AssetCalibration {
    id: string | undefined;
    calibrationType: CalibrationType;
    temperatureSensors: TemperatureReading[];
    isLimited: boolean;
    date: Date | null;
    recommendedInterval: number;
    nextCustomDueDate: Date | null;
    nextRecommendedDate: Date | null;
    comments: string;
    entryType: string;
    operator: CalibrationOperator | null;
}

export enum CalibrationType {
    ExternalCalibration = 'EXTERNAL_CALIBRATION',
    SelfCalibration = 'SELF_CALIBRATION'
}

export interface CalibrationOperator {
    displayName: string;
    userId: string;
}

/**
 * An interface that defines information about the asset's
 * location 'LIVENESS' state.
 */
export interface AssetLocationState {
    assetPresence: AssetPresence;
    systemConnection: AssetSystemConnection;
}

/**
 * An interface that defines location information about an asset.
 */
export interface AssetLocation {
    minionId?: string | null;
    physicalLocation?: string;
    parent: string;
    resourceUri?: string;
    slotNumber: number;
    state: AssetLocationState;
}

/**
 * The enumeration defines the available states of an asset,
 * defined by the Asset service.
 */
export enum AssetPresence {
    Present = 'PRESENT',
    NotPresent = 'NOT_PRESENT'
}

/**
 * The enumeration defines the available states of a connected system,
 * defined by the Asset service.
 */
export enum AssetSystemConnection {
    Connected = 'CONNECTED',
    Disconnected = 'DISCONNECTED'
}

/**
 * An interface that defines information about a temperature reading
 */
export interface TemperatureReading {
    name: string;
    reading: number;
}
export enum AssetType {
    GENERIC = 'GENERIC',
    DEVICE_UNDER_TEST = 'DEVICE_UNDER_TEST',
    FIXTURE = 'FIXTURE',
    SYSTEM = 'SYSTEM'
}

export enum DiscoveryType {
    Automatic = 'AUTOMATIC',
    Manual = 'MANUAL'
}

export enum BusType {
    BUILT_IN_SYSTEM = 'BUILT_IN_SYSTEM',
    PCI_PXI = 'PCI_PXI',
    USB = 'USB',
    GPIB = 'GPIB',
    VXI = 'VXI',
    SERIAL = 'SERIAL',
    TCP_IP = 'TCP_IP',
    CRIO = 'CRIO',
    SCXI = 'SCXI',
    CDAQ = 'CDAQ',
    SWITCH_BLOCK = 'SWITCH_BLOCK',
    SCC = 'SCC',
    FIRE_WIRE = 'FIRE_WIRE',
    ACCESSORY = 'ACCESSORY',
    CAN = 'CAN',
    SWITCH_BLOCK_DEVICE = 'SWITCH_BLOCK_DEVICE',
    SLSC = 'SLSC'
}

export interface Asset {
    assetType: AssetType;
    discoveryType: DiscoveryType;
    busType: BusType | undefined;
    calibrationStatus: string;
    externalCalibration: AssetCalibration | undefined;
    firmwareVersion: string;
    hardwareVersion: string;
    id: string;
    isNIAsset: boolean;
    isSystemController: boolean;
    keywords: string[];
    lastUpdatedTimestamp: Date;
    location: AssetLocation;
    modelName: string | undefined;
    modelNumber: number | undefined;
    name: string;
    properties: { [key: string]: string };
    selfCalibration: AssetCalibration | undefined;
    serialNumber: string | undefined;
    supportsExternalCalibration: boolean;
    supportsSelfCalibration: boolean;
    supportsSelfTest: boolean;
    temperatureSensors: TemperatureReading[];
    vendorName: string | undefined;
    vendorNumber: number;
    visaResourceName: string;
    workspace: string;
    fileIds: string[];
    supportsReset: boolean;
    status: string;
    jobStatus: string;
    utilizationStatus: string;
    tags: Tag[];
    partNumber: string;
}

export class Tag {
public constructor(
    public path: string,
    public workspace: string,
    public value?: string,
    public type?: string,
    public min?: string | null,
    public max?: string | null,
    public count?: number,
    public average?: number | null,
    public timestamp?: string,
    public properties?: { [key: string]: string } | null
) {}
}

export interface AssetResponse {
    assets: Asset[];
    totalCount: number;
}

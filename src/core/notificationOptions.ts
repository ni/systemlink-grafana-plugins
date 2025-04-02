export const enum Severity {
    brief,
    informative,
    permanent
}

export const enum NotificationType {
    error = 'error',
    info = 'info',
    success = 'success',
    warning = 'warning'
}

export interface NotificationOptions {
    content?: string | Error;
    detailsTitle?: string;
    details?: string;
    dismissible?: boolean;
    duration?: number;
    severity?: Severity;
    type?: NotificationType;
    link?: string;
    linkContent?: string;
}

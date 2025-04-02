import React from 'react';
import { Snackbar } from '@mui/material';
import './notificationPanel.scss';
import { NotificationOptions, NotificationType } from './notificationOptions';

interface NotificationPanelProps {
  data: NotificationOptions;
  onDismiss: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ data, onDismiss }) => {
  const content = data.content instanceof Error ? data.content.message : data.content;
  const details = data.details;
  const dismissible = data.dismissible;
  const duration = data.duration ?? 5000;
  let title = '';
  let icon = ' i ';

  switch (data.type) {
    case NotificationType.error:
      title = 'Error';
      icon = ' ! ';
      break;
    case NotificationType.warning:
      title = 'Warning';
      icon = ' ! ';
      break;
    default:
      title = '';
      icon = ' i ';
      break;
  }

  const onDissmissClick = () => {
    onDismiss();
  };

  return (
    <Snackbar
      open={data.content !== ''}
      onClose={onDismiss}
      autoHideDuration={duration}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{
        minWidth: '400px',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        borderRadius: '2px',
        boxShadow: '0 3px 5px -1px rgba(0, 0, 0, 0.3), 0 6px 10px rgba(0, 0, 0, 0.24), 0 1px 18px rgba(0, 0, 0, 0.31)',
      }}
    >
      <div className="notification">
        <div className="header">
          <span className="severity-icon">{icon}</span>
          {title}
          <span className="close-icon" onClick={onDissmissClick}>
            {dismissible ? ' X ' : ''}
          </span>
        </div>
        <div className="body">
          <p className="content">{content}</p>
          {details && (
            <details>
              <summary>Details</summary>
              <div>{details}</div>
            </details>
          )}
        </div>
      </div>
    </Snackbar>
  );
};

export default NotificationPanel;

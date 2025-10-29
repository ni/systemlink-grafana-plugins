import React from 'react';
import { render, screen } from '@testing-library/react';
import { PanelProps } from '@grafana/data';
import { QRCodePanel } from './QRCodePanel';
import { QRCodePanelOptions } from './types';

jest.mock('react-qr-code', () => {
    const MockQRCode = ({ value, ...props }: any) => (
        <div data-testid="qrcode-code" value={value} {...props}>
            {value}
        </div>
    );
    
    return MockQRCode;
});

describe('QR Code Panel', () => {
    const createMockProps = (
        options: Partial<QRCodePanelOptions> = {},
        replaceVariables: jest.Mock = jest.fn((str) => str)
    ): PanelProps<QRCodePanelOptions> => ({
        options: {
            value: 'https://ni.com',
            ...options,
        },
        data: { series: [] } as any,
        timeRange: {} as any,
        timeZone: 'UTC',
        width: 300,
        height: 200,
        fieldConfig: {} as any,
        id: 1,
        title: 'QR code',
        transparent: false,
        renderCounter: 1,
        onOptionsChange: jest.fn(),
        onFieldConfigChange: jest.fn(),
        replaceVariables,
        onChangeTimeRange: jest.fn(),
        eventBus: {} as any,
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Default Rendering', () => {
        it('should render QR code with default value', () => {
            const props = createMockProps();

            render(<QRCodePanel {...props} />);

            expect(screen.getByTestId('qrcode-code')).toBeInTheDocument();
            expect(screen.getByTestId('qrcode-code')).toHaveAttribute('value', 'https://ni.com');
        });
    });

    describe('Grafana Dashboard Variables', () => {
        it('should update from static value to variable value', () => {
            const mockReplaceVariables = jest.fn((str) => str);
            const props = createMockProps({}, mockReplaceVariables);
            const { rerender } = render(<QRCodePanel {...props} />);

            expect(screen.getByTestId('qrcode-code')).toHaveAttribute('value', 'https://ni.com');
            expect(mockReplaceVariables).toHaveBeenCalledWith('https://ni.com');

            mockReplaceVariables.mockReturnValue('new-asset');
            const updatedProps = {
                ...props,
                options: { value: '${assetId}' },
            };

            rerender(<QRCodePanel {...updatedProps} />);

            expect(screen.getByTestId('qrcode-code')).toHaveAttribute('value', 'new-asset');
            expect(mockReplaceVariables).toHaveBeenCalledWith('${assetId}');
            expect(mockReplaceVariables).toHaveBeenCalledTimes(2);
        });

        it('should call replaceVariables with the option value', () => {
            const mockReplaceVariables = jest.fn();
            mockReplaceVariables.mockReturnValueOnce('old-asset');
            const props = createMockProps({ value: '${assetId}' }, mockReplaceVariables);
            const { rerender } = render(<QRCodePanel {...props} />);

            expect(screen.getByTestId('qrcode-code')).toHaveAttribute('value', 'old-asset');
            expect(mockReplaceVariables).toHaveBeenCalledWith('${assetId}');
            expect(mockReplaceVariables).toHaveBeenCalledTimes(1);

            mockReplaceVariables.mockReturnValueOnce('new-asset');
            const updatedProps = { ...props, renderCounter: 2 };
            
            rerender(<QRCodePanel {...updatedProps} />);

            expect(screen.getByTestId('qrcode-code')).toHaveAttribute('value', 'new-asset');
            expect(mockReplaceVariables).toHaveBeenCalledWith('${assetId}');
            expect(mockReplaceVariables).toHaveBeenCalledTimes(2);
        });
    });
});

import React from 'react';
import { render } from '@testing-library/react';
import { PanelProps } from '@grafana/data';
import { QRCodePanel } from './QRCodePanel';
import { QRCodePanelOptions } from './types';

describe('QR Code SVG Generation', () => {
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


    it('should render SVG path elements', () => {
        const props = createMockProps();

        render(<QRCodePanel {...props} />);

        const svgElement = document.querySelector('svg');
        const pathElements = document.querySelectorAll('path');
        const pathData = pathElements[0].getAttribute('d');
        const qrCodeStartingPattern = /^M/;

        expect(svgElement).toBeInTheDocument();
        expect(pathElements.length).toBeGreaterThan(0);
        expect(pathElements[0]).toHaveAttribute('d');
        expect(pathData?.trim()).toMatch(qrCodeStartingPattern);
    });

    it('should generate different SVG paths for different values', () => {
        const props = createMockProps();
        const { rerender } = render(<QRCodePanel {...props} />);
        const initialPaths = Array.from(document.querySelectorAll('path')).map(path => ({
            d: path.getAttribute('d'),
            fill: path.getAttribute('fill')
        }));

        expect(initialPaths.length).toBeGreaterThan(0);

        const updatedProps = {
            ...props,
            options: { value: 'new-asset' },
            renderCounter: 2
        };

        rerender(<QRCodePanel {...updatedProps} />);

        const newPaths = Array.from(document.querySelectorAll('path')).map(path => ({
            d: path.getAttribute('d'),
            fill: path.getAttribute('fill')
        }));
        const initialDs = initialPaths.map(p => p.d);
        const newDs = newPaths.map(p => p.d);
        const hasDifferentPaths = initialDs.some((initialD, index) =>
            initialD !== newDs[index]
        );

        expect(hasDifferentPaths).toBe(true);
        expect(newPaths.length).toBeGreaterThan(0);
        expect(newPaths).not.toEqual(initialPaths);
    });

    it('should generate different SVG when variable values change', () => {
        const mockReplaceVariables = jest.fn();
        mockReplaceVariables.mockReturnValueOnce('old-asset');
        const props = createMockProps({ value: '${assetId}' }, mockReplaceVariables);
        const { rerender } = render(<QRCodePanel {...props} />);
        const initialSvg = document.querySelector('svg')?.innerHTML;
        const initialPaths = Array.from(document.querySelectorAll('path')).map(path =>
            path.getAttribute('d')
        );

        expect(initialPaths.length).toBeGreaterThan(0);
        expect(mockReplaceVariables).toHaveBeenCalledWith('${assetId}');

        mockReplaceVariables.mockReturnValueOnce('new-asset');
        const updatedProps = { ...props, renderCounter: 2 };

        rerender(<QRCodePanel {...updatedProps} />);

        const newSvg = document.querySelector('svg')?.innerHTML;
        const newPaths = Array.from(document.querySelectorAll('path')).map(path =>
            path.getAttribute('d')
        );

        expect(newPaths.length).toBeGreaterThan(0);
        expect(newPaths).not.toEqual(initialPaths);
        expect(newSvg).not.toBe(initialSvg);
        expect(mockReplaceVariables).toHaveBeenCalledTimes(2);
        expect(mockReplaceVariables).toHaveBeenLastCalledWith('${assetId}');
    });

    it('should handle same value producing same QR code', () => {
        const props = createMockProps();
        const { rerender } = render(<QRCodePanel {...props} />);
        const initialPaths = Array.from(document.querySelectorAll('path')).map(path =>
            path.getAttribute('d')
        );
        const updatedProps = { ...props, renderCounter: 2 };

        rerender(<QRCodePanel {...updatedProps} />);

        const newPaths = Array.from(document.querySelectorAll('path')).map(path =>
            path.getAttribute('d')
        );

        expect(newPaths).toEqual(initialPaths);
    });
});

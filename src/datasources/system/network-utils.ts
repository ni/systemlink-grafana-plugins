/**
 * Utility functions for parsing IP, MAC addresses, identify IP and hostname
 */
export class NetworkUtils {
    static getIpAddressFromInterfaces(ipInterfaces: { [key: string]: string[] }): string | null {
        if (ipInterfaces) {
            const firstConnectedInterface = NetworkUtils.getFirstConnectedInterface(ipInterfaces);
            if (firstConnectedInterface) {
                return firstConnectedInterface.address;
            }
        }

        return null;
    }

    static getFirstConnectedInterface(ipInterfaces: { [key: string]: string[] }): { name: string, address: string } | null {
        for (const ipInterfaceName in ipInterfaces) {
            if (!ipInterfaceName) {
                continue;
            }
            const ipInterfaceAddresses = ipInterfaces[ipInterfaceName];
            if (ipInterfaceName !== 'lo' && this.isInterfaceConnected(ipInterfaceAddresses)) {
                return {
                    name: ipInterfaceName,
                    address: ipInterfaceAddresses[0]
                };
            }
        }

        return null;
    }

    static getMacAddressFromInterfaceName(ipInterfaceName: string, hwaddrInterfaces: { [key: string]: string }): string | null {
        if (!hwaddrInterfaces) {
            return null;
        }
        return hwaddrInterfaces[ipInterfaceName] || null;
    }

    static isValidIp(hostnameOrIpAddress: string): boolean {
        const validIpAddressRegex = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;
        return validIpAddressRegex.test(hostnameOrIpAddress);
    }

    static isValidHostname(hostnameOrIpAddress: string): boolean {
        const validHostnameRegex = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$/;
        return validHostnameRegex.test(hostnameOrIpAddress);
    }

    private static isInterfaceConnected(ipInterfaceAddresses: string[]): boolean {
        if (!ipInterfaceAddresses || ipInterfaceAddresses.length === 0) {
            return false;
        }
        if (ipInterfaceAddresses.length > 1) {
            return true;
        }

        const ipInterfaceAddress = ipInterfaceAddresses[0];
        if (ipInterfaceAddress === '0.0.0.0' || ipInterfaceAddress === '::') {
            // https://tools.ietf.org/html/rfc3513#section-2.5.2
            // These addresses are used as non-routable meta-addresses
            // to designate an invalid, unknown, or non-applicable address.
            return false;
        }
        return true;
    }
}

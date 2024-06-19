/**
 * Utility functions for parsing IP addresses
 */
export class NetworkUtils {
  static getIpAddressFromInterfaces(...protocols: Array<Record<string, string[]> | undefined>): string | null {
    for (const ipInterfaces of protocols) {
      if (ipInterfaces) {
        const firstConnectedInterface = NetworkUtils.getFirstConnectedInterface(ipInterfaces);
        if (firstConnectedInterface) {
          return firstConnectedInterface.address;
        }
      }
    }

    return null;
  }

  static getFirstConnectedInterface(ipInterfaces: Record<string, string[]>): { name: string; address: string } | null {
    for (const ipInterfaceName in ipInterfaces) {
      if (!ipInterfaceName) {
        continue;
      }
      const ipInterfaceAddresses = ipInterfaces[ipInterfaceName];
      if (ipInterfaceName !== 'lo' && this.isInterfaceConnected(ipInterfaceAddresses)) {
        return {
          name: ipInterfaceName,
          address: ipInterfaceAddresses[0],
        };
      }
    }

    return null;
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

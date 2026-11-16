import type { Configuration } from 'webpack';
import grafanaConfig from './.config/webpack/webpack.config';

export default async function config(env: { production?: boolean; development?: boolean }): Promise<Configuration> {
  const baseConfig = await grafanaConfig(env);
  return {
    ...baseConfig,
    module: {
      ...baseConfig.module,
      rules: [
        ...(baseConfig.module?.rules ?? []),
        {
          test: /\.m?js$/,
          include: /node_modules[\\/]@ni[\\/]/,
          // Nimble and its FAST dependencies publish ESM with extensionless imports.
          resolve: { fullySpecified: false },
        },
      ],
    },
  };
}

module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: { node: 'current' },
        modules: process.env.NODE_OPTIONS?.includes('--experimental-vm-modules') ? false : 'auto',
      },
    ],
  ],
};

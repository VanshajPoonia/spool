// The rules under test import component types now and then; their CSS modules only need a shape here.
declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}

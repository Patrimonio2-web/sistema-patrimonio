import assert from "node:assert/strict";
import test from "node:test";
import { matchesReportSelection } from "./reportDetail.ts";

const selection = (kind, key) => ({ kind, key, label: key, total: 1 });
const item = (values = {}) => ({
  id_mobiliario: "5193",
  descripcion: "",
  clase_bien: "",
  anexo: "",
  subdependencia: "",
  ...values,
});

test("specific counters use the same class and description terms as the dashboard", () => {
  assert.equal(matchesReportSelection(item({ clase_bien: "COMPUTADORA", descripcion: "Notebook" }), selection("specific", "computadoras")), true);
  assert.equal(matchesReportSelection(item({ descripcion: "Equipo PC de escritorio" }), selection("specific", "computadoras")), true);
  assert.equal(matchesReportSelection(item({ descripcion: "MESA P/ COMPUTADORA - COLOR NEGRO", clase_bien: "MESA P/ COMPUTADORA" }), selection("specific", "computadoras")), false);
  assert.equal(matchesReportSelection(item({ descripcion: "SILLA PARA PC", clase_bien: "SILLA" }), selection("specific", "computadoras")), false);
  assert.equal(matchesReportSelection(item({ descripcion: "VIDEO CAMARA P/PC", clase_bien: "VIDEO CAMARA" }), selection("specific", "computadoras")), false);
  assert.equal(matchesReportSelection(item({ descripcion: "Copia de seguridad" }), selection("specific", "computadoras")), false);
  assert.equal(matchesReportSelection(item({ descripcion: "Impresora multifuncion" }), selection("specific", "impresoras")), true);
  assert.equal(matchesReportSelection(item({ descripcion: "Monitor TV" }), selection("specific", "monitores")), true);
  assert.equal(matchesReportSelection(item({ descripcion: "Monitor TV" }), selection("specific", "televisores")), true);
  assert.equal(matchesReportSelection(item({ clase_bien: "TELEFONO" }), selection("specific", "telefonia")), true);
  assert.equal(matchesReportSelection(item({ descripcion: "MESA PARA TELEFONO" }), selection("specific", "telefonia")), false);
  assert.equal(matchesReportSelection(item({ descripcion: "TELÉFONO INALÁMBRICO" }), selection("specific", "telefonia")), true);
  assert.equal(matchesReportSelection(item({ descripcion: "Aire acondicionado" }), selection("specific", "climatizacion")), true);
  assert.equal(matchesReportSelection(item({ id_rubro: 432, clase_bien: "VEHICULO UTILITARIO" }), selection("specific", "vehiculos")), true);
  assert.equal(matchesReportSelection(item({ id_rubro: 432, clase_bien: "CARRETILLA DE MANO" }), selection("specific", "vehiculos")), false);
  assert.equal(matchesReportSelection(item({ descripcion: "Extintor ABC" }), selection("specific", "matafuegos")), true);
});

test("alert counters match flags and missing values", () => {
  const flagged = item({ faltante: true, para_baja: true, para_reparacion: false });
  assert.equal(matchesReportSelection(flagged, selection("alert", "faltantes")), true);
  assert.equal(matchesReportSelection(flagged, selection("alert", "para_baja")), true);
  assert.equal(matchesReportSelection(flagged, selection("alert", "para_reparacion")), false);
  assert.equal(matchesReportSelection(item({ estado_conservacion: "  " }), selection("alert", "sin_estado")), true);
  assert.equal(matchesReportSelection(item({ foto_url: " ", foto_url_2: null }), selection("alert", "sin_foto")), true);
  assert.equal(matchesReportSelection(item({ foto_url: "/imagen.jpg" }), selection("alert", "sin_foto")), false);
  assert.equal(matchesReportSelection(item({ id_rubro: null, id_clase: null }), selection("alert", "sin_rubro")), true);
  assert.equal(matchesReportSelection(item({ id_rubro: null, id_clase: null }), selection("alert", "sin_clase")), true);
});

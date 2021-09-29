/**
 * reference highlighters:
 * #fffab940 - factual content
 * #ffc67740 - legal reasoning
 * #ffb5af40 - rejected/dissenting resoning
 * #93e2fc40 - disposition
 * #f0caff40 - procedural posture
 * #cde7b440 - concurrances / likely dicta / important case cites
 *
 * reference underline
 * #000000 - section undeline
 * #669c34 - Case Name unerline
 */

/**
 * AnnotationTypes describe a kind of annotation "marker".
 * name: [optional] string - the name of the marker
 * color: [{r,g,b} | #rrggbb] - the color of the marker, [0-1]
 * annotation_types - at least one of: [highlight, underline] TODO: more types
 */
export default [
  {
    name: "TEST COLOR",
    highlight_color: "#cc3388",
    opacity: 0.25,
  },
  {
    name: "Factual Content",
    highlight_color: "#fffab9",
    opacity: 0.25,
  },
  {
    name: "Legal Reasoning",
    highlight_color: "#fdd9a8",
    opacity: 0.25,
  },
  {
    name: "Rejected or Dissenting Reasoning",
    highlight_color: "#fedbd8",
    opacity: 0.25,
  },
  {
    name: "Disposition",
    highlight_color: "#ccefff",
    opacity: 0.25,
  },
  {
    name: "Procedural Posture",
    highlight_color: "#f0caff",
    opacity: 0.25,
  },
  {
    name: "Concurrences / Likely Dicta / Important Case Cites",
    highlight_color: "#deeed4",
    opacity: 0.25,
  },
  {
    name: "Section Underline",
    underline_color: "#000000",
    underline_thickness: "2px",
  },
  {
    name: "Case Name Underline",
    underline_color: "#669c34",
    underline_thickness: "1px",
  },
];

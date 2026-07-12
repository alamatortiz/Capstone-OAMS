// Renders a college's abbreviation and name as "ABBR - Full Name", the
// standard label format for every college/department dropdown in the app.
export function formatCollegeLabel(abbrev, name) {
  // data/colleges.js's `name` field already embeds "(ABBR)" -- strip it so
  // callers using that source don't end up with "CCS - College of X (CCS)".
  const bareName = name.replace(new RegExp(`\\s*\\(${abbrev}\\)$`), "");
  return `${abbrev} - ${bareName}`;
}

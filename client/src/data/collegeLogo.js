// Centralized college logo resolver.
// Returns a logo URL/path based on the college name coming from queue objects.

import CCS from "../assets/CCS.png";
import CBAA from "../assets/CBAA.png";
import COE from "../assets/COE.png";
import COED from "../assets/COED.png";
import CAS from "../assets/CAS.png";
import CHAS from "../assets/CHAS.png";

const COLLEGE_LOGOS = {
  "College of Computing Studies (CCS)": CCS,
  "College of Business, Accountancy and Administration (CBAA)": CBAA,
  "College of Business Accountancy and Administration (CBAA)": CBAA,
  "College of Education (COED)": COED,
  "College of Engineering (COE)": COE,
  "College of Arts and Sciences (CAS)": CAS,
  "College of Health and Allied Sciences (CHAS)": CHAS,

  // Short names
  "College of Computing Studies": CCS,
  "College of Business, Accountancy and Administration": CBAA,
  "College of Business Accountancy and Administration": CBAA,
  "College of Education": COED,
  "College of Engineering": COE,
  "College of Arts and Sciences": CAS,
  "College of Health and Allied Sciences": CHAS,
};

export function getCollegeLogo(collegeName) {
  if (!collegeName) return CCS;

  // Exact match first
  if (COLLEGE_LOGOS[collegeName]) {
    return COLLEGE_LOGOS[collegeName];
  }

  // Fallback abbreviation matching
  const name = collegeName.toUpperCase();

  if (name.includes("CBAA")) return CBAA;
  if (name.includes("CCS")) return CCS;
  if (name.includes("COED")) return COED;
  if (name.includes("COE")) return COE;
  if (name.includes("CHAS")) return CHAS;
  if (name.includes("CAS")) return CAS;

  return CCS;
}
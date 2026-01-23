
/**
 * XEENAPS PKM - CITATION GENERATOR SERVICE
 * Handles multiple styles and languages for academic citations.
 */

function formatCitations(item, style, lang) {
  const authors = item.authors || [];
  const year = item.year || "n.d.";
  const title = item.title || "Untitled";
  const publisher = item.publisher || "";
  const journal = item.pubInfo?.journal || "";
  const vol = item.pubInfo?.vol || "";
  const issue = item.pubInfo?.issue || "";
  const pages = item.pubInfo?.pages || "";
  const doi = item.identifiers?.doi || "";
  const url = item.url || "";

  // Helper for Language
  const isId = lang === 'Indonesian';
  const andStr = isId ? 'dan' : 'and';
  const etAlStr = 'et al.';
  const availableAt = isId ? 'Tersedia di' : 'Available at';
  const volStr = isId ? 'vol.' : 'vol.';
  const noStr = isId ? 'no.' : 'no.';
  const ppStr = isId ? 'hlm.' : 'pp.';

  // 1. Format Authors for In-Text
  let inTextAuthor = "";
  if (authors.length === 0) {
    inTextAuthor = "Anon.";
  } else if (authors.length === 1) {
    inTextAuthor = authors[0].split(' ').pop();
  } else if (authors.length === 2) {
    inTextAuthor = authors[0].split(' ').pop() + " " + andStr + " " + authors[1].split(' ').pop();
  } else {
    inTextAuthor = authors[0].split(' ').pop() + " " + etAlStr;
  }

  // 2. Format Authors for Bibliography
  const formattedBibAuthors = authors.map(a => {
    const parts = a.split(' ');
    const last = parts.pop();
    const firstInit = parts.length > 0 ? parts[0].charAt(0) + "." : "";
    return last + ", " + firstInit;
  });

  let bibAuthorStr = "";
  if (formattedBibAuthors.length === 0) {
    bibAuthorStr = "Anon.";
  } else if (formattedBibAuthors.length === 1) {
    bibAuthorStr = formattedBibAuthors[0];
  } else if (formattedBibAuthors.length === 2) {
    bibAuthorStr = formattedBibAuthors[0] + " " + andStr + " " + formattedBibAuthors[1];
  } else {
    bibAuthorStr = formattedBibAuthors.slice(0, -1).join(", ") + ", " + andStr + " " + formattedBibAuthors[formattedBibAuthors.length - 1];
  }

  // --- STYLE GENERATORS ---
  let parenthetical = "";
  let narrative = "";
  let bibliography = "";

  switch (style) {
    case 'APA (7th Edition)':
      parenthetical = `(${inTextAuthor}, ${year})`;
      narrative = `${inTextAuthor} (${year})`;
      bibliography = `${bibAuthorStr} (${year}). ${title}. `;
      if (journal) {
        bibliography += `<i>${journal}</i>`;
        if (vol) bibliography += `, <i>${vol}</i>`;
        if (issue) bibliography += `(${issue})`;
        if (pages) bibliography += `, ${pages}`;
      } else if (publisher) {
        bibliography += `${publisher}.`;
      }
      if (doi) bibliography += `. https://doi.org/${doi}`;
      else if (url) bibliography += `. ${url}`;
      break;

    case 'IEEE (Numeric)':
      parenthetical = `[1]`;
      narrative = `[1]`;
      const ieeeAuthors = authors.map(a => {
         const p = a.split(' ');
         return p[0].charAt(0) + ". " + p.pop();
      }).join(", ");
      bibliography = `${ieeeAuthors}, "${title}," `;
      if (journal) {
        bibliography += `<i>${journal}</i>, ${volStr} ${vol}, ${noStr} ${issue}, ${ppStr} ${pages}, ${year}.`;
      } else {
        bibliography += `${publisher}, ${year}.`;
      }
      break;

    case 'Chicago (Author-Date)':
      parenthetical = `(${inTextAuthor} ${year})`;
      narrative = `${inTextAuthor} (${year})`;
      bibliography = `${bibAuthorStr}. ${year}. "${title}." `;
      if (journal) {
        bibliography += `<i>${journal}</i>`;
        if (vol) bibliography += ` ${vol}`;
        if (issue) bibliography += `, no. ${issue}`;
        if (pages) bibliography += `: ${pages}`;
      } else if (publisher) {
        bibliography += `${publisher}.`;
      }
      if (doi) bibliography += ` https://doi.org/${doi}.`;
      else if (url) bibliography += ` ${url}.`;
      break;

    case 'Vancouver':
      parenthetical = `(1)`;
      narrative = `(1)`;
      const vancouverAuthors = authors.map(a => {
        const p = a.split(' ');
        const last = p.pop();
        const initials = p.map(n => n.charAt(0).toUpperCase()).join('');
        return last + ' ' + initials;
      }).join(', ');
      bibliography = `${vancouverAuthors}. ${title}. `;
      if (journal) {
        bibliography += `${journal}. ${year};`;
        if (vol) bibliography += `${vol}`;
        if (issue) bibliography += `(${issue})`;
        if (pages) bibliography += `:${pages}.`;
      } else {
        bibliography += `${publisher}; ${year}.`;
      }
      break;

    case 'Harvard (Xeenaps)':
    default:
      parenthetical = `(${inTextAuthor}, ${year})`;
      narrative = `${inTextAuthor} (${year})`;
      bibliography = `${bibAuthorStr} (${year}) '${title}'`;
      if (journal) {
        bibliography += `, <i>${journal}</i>`;
        if (vol) bibliography += `, ${vol}`;
        if (issue) bibliography += `(${issue})`;
        if (pages) bibliography += `, ${ppStr} ${pages}`;
      } else if (publisher) {
        bibliography += `, ${publisher}`;
      }
      const citeSource = doi ? `https://doi.org/${doi}` : url;
      if (citeSource) bibliography += `. ${availableAt}: ${citeSource}`;
      break;
  }

  return {
    parenthetical,
    narrative,
    bibliography
  };
}

import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import Fuse from "fuse.js";
import { useEffect, useMemo, useState } from "react";
import {
  FiBookOpen,
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiClipboard,
  FiCopy,
  FiHash,
  FiPrinter,
  FiSearch,
  FiX,
} from "react-icons/fi";

import checklist from "../../data/room-processing-checklist.json";

const PINNED_SECTION_NAMES = [
  "General",
  "Room Notes",
  "Cabinet Notes Checklist",
];

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const enrichEntries = (sourceEntries, section, depth = 0) =>
  sourceEntries.map((entry) => ({
    ...entry,
    tags: entry.tags ?? [],
    sectionId: section.id,
    sectionName: section.name,
    depth,
    children: enrichEntries(entry.children ?? [], section, depth + 1),
  }));

const flattenEntries = (sourceEntries) =>
  sourceEntries.flatMap((entry) => [
    entry,
    ...flattenEntries(entry.children ?? []),
  ]);

const countEntries = (sourceEntries, excludeContext = false) =>
  sourceEntries.reduce(
    (total, entry) =>
      total +
      (excludeContext && entry.isContextOnly ? 0 : 1) +
      countEntries(entry.children ?? [], excludeContext),
    0,
  );

const filterEntryTree = (sourceEntries, matchingIds, activeTag) =>
  sourceEntries
    .map((entry) => {
      const children = filterEntryTree(entry.children, matchingIds, activeTag);
      const matchesSearch = !matchingIds || matchingIds.has(entry.id);
      const matchesTag = !activeTag || entry.tags.includes(activeTag);
      const isMatch = matchesSearch && matchesTag;

      if (!isMatch && children.length === 0) return null;

      return {
        ...entry,
        children,
        isContextOnly: !isMatch,
      };
    })
    .filter(Boolean);

const orderedSections = [...checklist.sections].sort((sectionA, sectionB) => {
  const pinnedIndexA = PINNED_SECTION_NAMES.indexOf(sectionA.name);
  const pinnedIndexB = PINNED_SECTION_NAMES.indexOf(sectionB.name);

  if (pinnedIndexA !== -1 || pinnedIndexB !== -1) {
    if (pinnedIndexA === -1) return 1;
    if (pinnedIndexB === -1) return -1;
    return pinnedIndexA - pinnedIndexB;
  }

  return sectionA.name.localeCompare(sectionB.name);
});

const sections = orderedSections.map((section) => {
  const normalizedSection = {
    ...section,
    id: `section-${slugify(section.name)}`,
  };

  return {
    ...normalizedSection,
    entries: enrichEntries(section.entries, normalizedSection),
  };
});

const entries = sections.flatMap((section) => flattenEntries(section.entries));

const allTags = [...new Set(entries.flatMap((entry) => entry.tags))].sort(
  (a, b) => a.localeCompare(b),
);

const fuzzySearch = new Fuse(entries, {
  threshold: 0.38,
  ignoreLocation: true,
  includeMatches: true,
  includeScore: true,
  minMatchCharLength: 1,
  keys: [
    { name: "rule", weight: 0.6 },
    { name: "example", weight: 0.25 },
    { name: "examples.text", weight: 0.25 },
    { name: "examples.label", weight: 0.15 },
    { name: "tags", weight: 0.15 },
  ],
});

const mergeMatchIndices = (indices = []) => {
  if (!indices.length) return [];

  return [...indices]
    .sort((a, b) => a[0] - b[0])
    .reduce((merged, current) => {
      const previous = merged[merged.length - 1];

      if (previous && current[0] <= previous[1] + 1) {
        previous[1] = Math.max(previous[1], current[1]);
      } else {
        merged.push([...current]);
      }

      return merged;
    }, []);
};

const highlightText = (text, indices = []) => {
  if (!text || !indices.length) return text;

  const ranges = mergeMatchIndices(indices);
  const pieces = [];
  let cursor = 0;

  ranges.forEach(([start, end], index) => {
    if (start > cursor) {
      pieces.push(text.slice(cursor, start));
    }

    pieces.push(
      <mark
        key={`${start}-${end}-${index}`}
        className="rounded-sm bg-amber-200 px-0.5 text-inherit print:bg-transparent print:font-bold"
      >
        {text.slice(start, end + 1)}
      </mark>,
    );
    cursor = end + 1;
  });

  if (cursor < text.length) {
    pieces.push(text.slice(cursor));
  }

  return pieces;
};

const getMatchIndices = (matches, key, refIndex) =>
  matches
    ?.filter(
      (match) =>
        match.key === key &&
        (refIndex === undefined || match.refIndex === refIndex),
    )
    .flatMap((match) => match.indices) ?? [];

const formatDate = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
};

const getExampleOptions = (entry) => {
  if (entry.examples?.length) {
    return entry.examples.map((option, index) => ({
      id: option.id ?? String(index),
      label: option.label,
      text: option.text,
    }));
  }

  return entry.example
    ? [{ id: "default", label: null, text: entry.example }]
    : [];
};

const ChecklistEntry = ({
  entry,
  searchResultById,
  copiedEntryId,
  copiedExampleId,
  onCopyLink,
  onCopyExample,
}) => {
  const result = searchResultById.get(entry.id);
  const matches = result?.matches;
  const exampleOptions = getExampleOptions(entry);
  const isReferenceBlock =
    exampleOptions.length === 1 && exampleOptions[0].text.includes("\n");
  const isChild = entry.depth > 0;

  return (
    <div
      className={
        isChild
          ? "relative ml-4 border-l-2 border-teal-300 pl-3 sm:ml-8 sm:pl-5 print:ml-4 print:pl-3"
          : ""
      }
    >
      <article
        id={entry.id}
        className={`scroll-mt-[126px] p-4 sm:p-5 print:break-inside-avoid print:py-2.5 ${
          isChild
            ? "my-2 rounded-xl border border-slate-200 bg-slate-50 shadow-sm print:my-1 print:rounded-none print:shadow-none"
            : "print:px-0"
        }`}
      >
        {/* {isChild && (
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-teal-700 print:text-[8px] print:text-black">
            Sub-entry
          </div>
        )} */}
        {entry.isContextOnly && (
          <div className="mb-2 inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 print:hidden">
            Parent context
          </div>
        )}
        <div className="flex items-start gap-3">
          <FiHash
            className="mt-1 hidden shrink-0 text-slate-300 sm:block print:hidden"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[15px] font-medium leading-6 text-slate-800 sm:text-base sm:leading-7 print:text-[11px] print:leading-4 print:text-black">
                {highlightText(entry.rule, getMatchIndices(matches, "rule"))}
              </p>
              <button
                type="button"
                onClick={() => onCopyLink(entry.id)}
                className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 sm:px-3 print:hidden"
                aria-label={`Copy link to: ${entry.rule}`}
              >
                {copiedEntryId === entry.id ? (
                  <>
                    <FiCheck aria-hidden="true" />
                    <span className="hidden sm:inline">Copied</span>
                  </>
                ) : (
                  <>
                    <FiHash aria-hidden="true" />
                    <span className="hidden sm:inline">Copy link</span>
                  </>
                )}
              </button>
            </div>

            {exampleOptions.length > 0 && (
              <div className="mt-3 rounded-lg border-l-4 border-teal-600 bg-slate-950 px-3.5 py-3 text-slate-50 print:mt-1.5 print:rounded-none print:border print:border-slate-400 print:bg-white print:px-2 print:py-1.5 print:text-black">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-teal-300 print:mb-1 print:text-[8px] print:text-black">
                  {entry.examplesTitle ?? (isReferenceBlock
                    ? "Cabinet Vision reference"
                    : exampleOptions.length > 1
                      ? "Cabinet Vision options"
                      : "Type in Cabinet Vision")}
                </div>
                <div className="divide-y divide-slate-700 print:divide-slate-300">
                  {exampleOptions.map((option, optionIndex) => {
                    const copyId = `${entry.id}:${option.id}`;
                    const matchKey = entry.examples ? "examples.text" : "example";

                    return (
                      <div
                        key={option.id}
                        className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          {option.label && (
                            <div className="mb-1 text-xs font-bold text-teal-200 print:text-[9px] print:text-black">
                              {highlightText(
                                option.label,
                                getMatchIndices(
                                  matches,
                                  "examples.label",
                                  optionIndex,
                                ),
                              )}
                            </div>
                          )}
                          <code className="whitespace-pre-wrap break-words font-mono text-sm leading-6 print:text-[10px] print:leading-4">
                            {highlightText(
                              option.text,
                              getMatchIndices(
                                matches,
                                matchKey,
                                entry.examples ? optionIndex : undefined,
                              ),
                            )}
                          </code>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            onCopyExample(entry.id, option.id, option.text)
                          }
                          className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-100 transition hover:border-teal-400 hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-slate-950 print:hidden"
                          aria-label={`Copy Cabinet Vision text: ${option.text}`}
                        >
                          {copiedExampleId === copyId ? (
                            <>
                              <FiCheck aria-hidden="true" />
                              Copied
                            </>
                          ) : (
                            <>
                              <FiCopy aria-hidden="true" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-1.5 print:mt-1">
              {entry.tags.map((tag, tagIndex) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 print:border print:border-slate-300 print:bg-white print:px-1.5 print:py-0 print:text-[8px] print:text-black"
                >
                  {highlightText(
                    tag,
                    getMatchIndices(matches, "tags", tagIndex),
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      </article>

      {entry.children.length > 0 && (
        <div
          className={
            isChild
              ? "space-y-2"
              : "border-t border-slate-200 bg-slate-100/70 py-2 print:bg-white"
          }
        >
          {entry.children.map((child) => (
            <ChecklistEntry
              key={child.id}
              entry={child}
              searchResultById={searchResultById}
              copiedEntryId={copiedEntryId}
              copiedExampleId={copiedExampleId}
              onCopyLink={onCopyLink}
              onCopyExample={onCopyExample}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const RoomProcessingChecklist = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [copiedEntryId, setCopiedEntryId] = useState("");
  const [copiedExampleId, setCopiedExampleId] = useState("");
  const [expandedSections, setExpandedSections] = useState(() =>
    Object.fromEntries(sections.map((section) => [section.id, true])),
  );

  const normalizedQuery = searchQuery.trim();

  const searchResults = useMemo(
    () => (normalizedQuery ? fuzzySearch.search(normalizedQuery) : []),
    [normalizedQuery],
  );

  const searchResultById = useMemo(
    () => new Map(searchResults.map((result) => [result.item.id, result])),
    [searchResults],
  );

  const visibleSections = useMemo(() => {
    const matchingIds = normalizedQuery
      ? new Set(searchResults.map((result) => result.item.id))
      : null;

    return sections
      .map((section) => ({
        ...section,
        entries: filterEntryTree(section.entries, matchingIds, activeTag),
      }))
      .filter((section) => section.entries.length > 0);
  }, [activeTag, normalizedQuery, searchResults]);

  const visibleEntryCount = useMemo(
    () =>
      visibleSections.reduce(
        (total, section) => total + countEntries(section.entries, true),
        0,
      ),
    [visibleSections],
  );

  useEffect(() => {
    if (!normalizedQuery && !activeTag) return;

    setExpandedSections((current) => ({
      ...current,
      ...Object.fromEntries(visibleSections.map((section) => [section.id, true])),
    }));
  }, [activeTag, normalizedQuery, visibleSections]);

  useEffect(() => {
    const revealHashTarget = () => {
      const targetId = decodeURIComponent(window.location.hash.slice(1));
      if (!targetId) return;

      const matchingEntry = entries.find((entry) => entry.id === targetId);
      if (matchingEntry) {
        setExpandedSections((current) => ({
          ...current,
          [matchingEntry.sectionId]: true,
        }));
      }

      window.requestAnimationFrame(() => {
        document.getElementById(targetId)?.scrollIntoView({ block: "start" });
      });
    };

    revealHashTarget();
    window.addEventListener("hashchange", revealHashTarget);

    return () => window.removeEventListener("hashchange", revealHashTarget);
  }, []);

  const clearFilters = () => {
    setSearchQuery("");
    setActiveTag("");
  };

  const toggleSection = (sectionId) => {
    setExpandedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  };

  const jumpToSection = (sectionId) => {
    setExpandedSections((current) => ({ ...current, [sectionId]: true }));
    window.history.replaceState(null, "", `#${sectionId}`);
    window.requestAnimationFrame(() => {
      document
        .getElementById(sectionId)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
    }
  };

  const copyEntryLink = async (entryId) => {
    const link = new URL(window.location.href);
    link.hash = entryId;

    await copyText(link.toString());

    setCopiedEntryId(entryId);
    window.setTimeout(() => setCopiedEntryId(""), 1800);
  };

  const copyExampleText = async (entryId, exampleId, text) => {
    await copyText(text);
    setCopiedExampleId(`${entryId}:${exampleId}`);
    window.setTimeout(() => setCopiedExampleId(""), 1800);
  };

  return (
    <div className="min-h-full bg-slate-900 text-left text-slate-900 print:bg-white">
      <div className="mx-auto max-w-[1500px] px-4 pb-16 pt-6 sm:px-6 lg:px-8 print:max-w-none print:px-0 print:pb-0 print:pt-0">
        <header className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 print:mb-4 print:border-0 print:p-0 print:shadow-none">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-teal-700 print:hidden">
                <FiClipboard aria-hidden="true" />
                Internal shop reference
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl print:hidden">
                {checklist.title}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 print:mt-0 print:text-sm print:leading-5 print:text-black">
                {checklist.description}
              </p>
              <p className="mt-3 text-sm font-medium text-slate-500 print:mt-1 print:text-xs print:text-black">
                Last updated {formatDate(checklist.lastUpdated)}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2 print:hidden">
              <button
                type="button"
                onClick={() => setIsGlossaryOpen(true)}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-500 hover:text-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
              >
                <FiBookOpen aria-hidden="true" />
                Glossary
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-500 hover:text-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
              >
                <FiPrinter aria-hidden="true" />
                Print
              </button>
            </div>
          </div>
        </header>

        <div className="sticky top-[50px] z-20 -mx-4 mb-5 border-y border-slate-700 bg-slate-900/95 px-4 py-3 shadow-sm backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 print:hidden">
          <div className="mx-auto max-w-[1436px]">
            <label htmlFor="processing-search" className="sr-only">
              Search checklist rules, Cabinet Vision notes, and tags
            </label>
            <div className="relative">
              <FiSearch
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              />
              <input
                id="processing-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search rules, Cabinet Vision notes, or tags…"
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-12 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-200"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 flex min-h-9 min-w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  aria-label="Clear search"
                >
                  <FiX aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>

        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">
              Filter by tag
            </h2>
            <span className="text-sm text-slate-500" aria-live="polite">
              Showing {visibleEntryCount} of {entries.length} rules
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag((current) => (current === tag ? "" : tag))}
                aria-pressed={activeTag === tag}
                className={`min-h-9 rounded-full border px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 ${
                  activeTag === tag
                    ? "border-teal-700 bg-teal-700 text-white"
                    : "border-slate-300 bg-slate-50 text-slate-700 hover:border-teal-500 hover:bg-teal-50 hover:text-teal-900"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
          {(normalizedQuery || activeTag) && (
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-3">
              <p className="text-sm text-slate-600">
                {normalizedQuery && (
                  <span>
                    Search: <strong>“{normalizedQuery}”</strong>
                  </span>
                )}
                {normalizedQuery && activeTag && <span> · </span>}
                {activeTag && (
                  <span>
                    Tag: <strong>{activeTag}</strong>
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-semibold text-teal-700 underline decoration-teal-300 underline-offset-4 hover:text-teal-900"
              >
                Clear filters
              </button>
            </div>
          )}
        </section>

        <details className="mb-5 rounded-xl border border-slate-200 bg-white shadow-sm lg:hidden print:hidden">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
            Jump to a section
            <FiChevronDown aria-hidden="true" />
          </summary>
          <nav className="grid gap-1 border-t border-slate-200 p-2" aria-label="Checklist sections">
            {visibleSections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => jumpToSection(section.id)}
                className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {section.name}
                <span className="ml-2 text-xs text-slate-400">
                  {countEntries(section.entries, true)}
                </span>
              </button>
            ))}
          </nav>
        </details>

        {visibleSections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm print:hidden">
            <FiSearch className="mx-auto mb-4 text-3xl text-slate-400" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-800">No matching rules</h2>
            <p className="mx-auto mt-2 max-w-md text-slate-500">
              Try a shorter search, a related shop term, or clear the active tag.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)] print:block">
            <aside className="sticky top-[126px] hidden max-h-[calc(100vh-150px)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:block print:hidden">
              <h2 className="px-2 pb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Sections
              </h2>
              <nav className="space-y-1" aria-label="Checklist sections">
                {visibleSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => jumpToSection(section.id)}
                    className="flex w-full items-start justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-teal-50 hover:text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <span>{section.name}</span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      {countEntries(section.entries, true)}
                    </span>
                  </button>
                ))}
              </nav>
            </aside>

            <div className="space-y-5 print:space-y-4">
              {visibleSections.map((section) => {
                const isExpanded = expandedSections[section.id];
                const sectionEntryCount = countEntries(section.entries, true);

                return (
                  <section
                    key={section.id}
                    id={section.id}
                    className="scroll-mt-[126px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:break-inside-auto print:overflow-visible print:rounded-none print:border-x-0 print:border-b-0 print:border-t-2 print:border-slate-500 print:shadow-none"
                  >
                    <h2>
                      <button
                        type="button"
                        onClick={() => toggleSection(section.id)}
                        className="flex w-full items-start justify-between gap-4 bg-slate-900 px-4 py-4 text-left text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-400 sm:px-5 print:pointer-events-none print:bg-white print:px-0 print:py-2 print:text-black"
                        aria-expanded={isExpanded}
                        aria-controls={`${section.id}-content`}
                      >
                        <span>
                          <span className="block text-lg font-bold sm:text-xl print:text-base">
                            {section.name}
                          </span>
                          {section.description && (
                            <span className="mt-1 block text-sm font-normal leading-5 text-slate-300 print:text-xs print:text-black">
                              {section.description}
                            </span>
                          )}
                        </span>
                        <span className="flex shrink-0 items-center gap-3">
                          <span className="rounded-full bg-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-200 print:bg-white print:px-0 print:text-black">
                            {sectionEntryCount} {sectionEntryCount === 1 ? "rule" : "rules"}
                          </span>
                          <span className="print:hidden">
                            {isExpanded ? (
                              <FiChevronUp aria-hidden="true" />
                            ) : (
                              <FiChevronDown aria-hidden="true" />
                            )}
                          </span>
                        </span>
                      </button>
                    </h2>

                    <div
                      id={`${section.id}-content`}
                      className={`${isExpanded ? "block" : "hidden"} divide-y divide-slate-200 print:block`}
                    >
                      {section.entries.map((entry) => (
                        <ChecklistEntry
                          key={entry.id}
                          entry={entry}
                          searchResultById={searchResultById}
                          copiedEntryId={copiedEntryId}
                          copiedExampleId={copiedExampleId}
                          onCopyLink={copyEntryLink}
                          onCopyExample={copyExampleText}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        )}

        <section className="mt-6 hidden break-before-page print:block">
          <h2 className="border-b-2 border-slate-500 pb-1 text-base font-bold">
            Glossary
          </h2>
          <dl className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1 text-[10px]">
            {checklist.glossary.map((item) => (
              <div key={item.abbr} className="flex break-inside-avoid gap-2">
                <dt className="w-24 shrink-0 font-bold">{item.abbr}</dt>
                <dd>{item.meaning}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <Dialog
        open={isGlossaryOpen}
        onClose={setIsGlossaryOpen}
        className="relative z-[70] print:hidden"
      >
        <div className="fixed inset-0 bg-slate-950/55" aria-hidden="true" />
        <div className="fixed inset-0 flex justify-end">
          <DialogPanel className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
                <FiBookOpen className="text-teal-700" aria-hidden="true" />
                Shop glossary
              </DialogTitle>
              <button
                type="button"
                onClick={() => setIsGlossaryOpen(false)}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                aria-label="Close glossary"
              >
                <FiX size={22} aria-hidden="true" />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4">
              <p className="mb-4 text-sm leading-6 text-slate-500">
                Common abbreviations used throughout the room-processing checklist.
              </p>
              <dl className="divide-y divide-slate-200 rounded-xl border border-slate-200">
                {checklist.glossary.map((item) => (
                  <div key={item.abbr} className="grid grid-cols-[110px_1fr] gap-3 px-4 py-3">
                    <dt className="font-mono text-sm font-bold text-teal-800">
                      {item.abbr}
                    </dt>
                    <dd className="text-sm leading-5 text-slate-700">
                      {item.meaning}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
};

export default RoomProcessingChecklist;

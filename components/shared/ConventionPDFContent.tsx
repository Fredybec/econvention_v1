import React, { useState, useEffect, useRef } from 'react';
import { PFERecord, ConventionTemplate, WorkflowStatus, StageType } from '../../types';
import { QRCodeComponent } from './QRCodeComponent';
import { replaceTemplateParams } from '../../utils/templateUtils';

export const ConventionPDFContent = React.forwardRef<HTMLDivElement, { record?: PFERecord, template: ConventionTemplate, isPreview?: boolean, scale?: number }>(({ record, template, isPreview = false, scale }, ref) => {
  if (!template || !template.margins) {
    return (
      <div className="p-12 text-center bg-white border border-dashed rounded-xl">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Chargement du modèle de convention...</p>
      </div>
    );
  }

  const studentName = record?.studentName || "NOM ÉTUDIANT";
  const massarCode = record?.data?.massarCode || "CODE MASSAR";
  const companyName = record?.data?.companyName || "ORGANISME D'ACCUEIL";
  const tutorName = record?.data?.tutorName || "NOM DU TUTEUR";
  const tutorEmail = record?.data?.tutorEmail || "EMAIL DU TUTEUR";
  const tutorPhone = record?.data?.tutorPhone || "TÉLÉPHONE DU TUTEUR";
  const fstTutorName = record?.data?.fstTutorName || "NOM ENCADRANT FST";
  const fstTutorEmail = record?.data?.fstTutorEmail || "EMAIL ENCADRANT FST";
  const filiere = record?.data?.filiere || "NOM DE LA FILIÈRE";
  const academicYear = record?.data?.academicYear || template?.academicYear || "2023/2024";
  const status = record?.status || WorkflowStatus.DRAFT;

  const stageType = record?.data?.stageType || StageType.PFE;
  const isBinome = record?.data?.isBinome || false;
  const binomeName = record?.data?.binomeName || "";
  const isBinomeText = isBinome ? ` & ${binomeName}` : "";

  const isSignedByDean = isPreview || [WorkflowStatus.READY_FOR_PICKUP, WorkflowStatus.COMPLETED].includes(status);

  // ─── Setup Sections ────────────────────────────────────────────────────────
  const sortedSections = [...(template.sections || [])].sort((a, b) => a.order - b.order);
  const titleSection      = sortedSections.find(s => s.type === 'title');
  const partiesSection    = sortedSections.find(s => s.type === 'parties');
  const articlesSection   = sortedSections.find(s => s.type === 'articles');
  const signaturesSection = sortedSections.find(s => s.type === 'signatures');

  // Select articles based on stage type with safe empty fallback
  const articlesToProcess = stageType === StageType.PFA 
    ? (template.pfaArticles || [])
    : (template.pfeArticles || []);

  const headerText = replaceTemplateParams(template.header, record, template);
  const footerText = replaceTemplateParams(template.footer, record, template);
  const documentTitle = replaceTemplateParams(template.documentTitle, record, template);
  const partiesIntro = replaceTemplateParams(template.partiesIntro, record, template);
  const establishmentContent = replaceTemplateParams(template.establishmentContent, record, template);
  const organizationContent = replaceTemplateParams(template.organizationContent, record, template);
  const studentContent = replaceTemplateParams(template.studentContent, record, template);
  
  const studentSignatureLabel = replaceTemplateParams(template.studentSignatureLabel, record, template);
  const organizationSignatureLabel = replaceTemplateParams(template.organizationSignatureLabel, record, template);
  const responsableSignatureLabel = replaceTemplateParams(template.responsableSignatureLabel || "Le Responsable de la Filière", record, template);
  const deanSignatureLabel = replaceTemplateParams(template.deanSignatureLabel, record, template);
  
  // ─── Precise A4 & Layout Constants ──────────────────────────────────────────
  const PAGE_H_MM   = 297;
  const PAGE_W_MM   = 210;
  const MARGIN_T_MM = template.margins?.top    ?? 20;
  const MARGIN_B_MM = template.margins?.bottom ?? 20;
  const MARGIN_L_MM = template.margins?.left   ?? 20;
  const MARGIN_R_MM = template.margins?.right  ?? 20;

  const HEADER_P1_MM  = template.headerHeight    || 45; 
  const HEADER_PN_MM  = template.subHeaderHeight || 25; 
  const FOOTER_MM     = template.footerHeight    || 30; 
  const CONTENT_PT_MM = 5;  

  // ─── Phase 1: Measurement & Calibration ─────────────────────────────────────
  const measureRef = useRef<HTMLDivElement>(null);
  const [pxPerMm, setPxPerMm] = useState<number>(3.7795275591); // Fallback
  
  const [measurements, setMeasurements] = useState<{
    blocks: number[] | null;
    parties: number | null;
    title: number | null;
    sig: number | null;
  }>({ blocks: null, parties: null, title: null, sig: null });

  // ─── Colors ────────────────────────────────────────────────────────────────
  const colors = {
    slate900: '#0f172a', slate800: '#1e293b', slate700: '#334155',
    slate600: '#475569', slate500: '#64748b', slate400: '#94a3b8',
    slate300: '#cbd5e1', slate200: '#e2e8f0', slate100: '#f1f5f9',
    slate50: '#f8fafc',  slate950: '#020617',
    border: '#cbd5e1', background: '#ffffff', text: '#0f172a',
    muted: '#94a3b8',  primary: '#1d4ed8'
  };

  const SAFETY_BUFFER_MM = 20; 
  const SECTION_GAP_MM = 10;

  // Granular blocks for pagination
  const granularBlocks = React.useMemo(() => {
    const blocks: { type: 'article-header' | 'paragraph'; artIdx: number; content: string; blockIdx: number }[] = [];
    let counter = 0;
    
    (articlesToProcess || []).forEach((art, artIdx) => {
      const position = artIdx + 1;
      
      // Get raw Title and Content
      let rawTitle = typeof art === 'string' ? "" : (art.title || "");
      const rawContent = typeof art === 'string' ? art : (art.content || "");

      // Numbering Logic: If title doesn't start with "Article X", prepend it
      const prefix = `Article ${position} : `;
      let displayTitle = replaceTemplateParams(rawTitle, record, template).trim();
      const displayContent = replaceTemplateParams(rawContent, record, template).trim();
      
      // If the title is just "Article X" or empty, or doesn't have the prefix, we ensure it's clean
      const titleLower = displayTitle.toLowerCase();
      if (!titleLower.startsWith('article') && !titleLower.startsWith('art.')) {
        displayTitle = prefix + displayTitle;
      } else if (titleLower.startsWith('article')) {
        // If it starts with Article but might have wrong number, we could replace it, 
        // but let's be conservative and just ensure there is a title.
        if (displayTitle.length < 15 && /article\s*\d+/i.test(displayTitle)) {
           // It's just a generic "Article N" title, let's normalize it to the current position
           displayTitle = `Article ${position}`;
        }
      }

      if (!displayTitle && !displayContent) return;

      blocks.push({ type: 'article-header', artIdx, content: displayTitle, blockIdx: counter++ });
      
      if (displayContent) {
        displayContent.split(/\n+/).filter(p => p.trim().length > 0).forEach(p => {
          blocks.push({ type: 'paragraph', artIdx, content: p.trim(), blockIdx: counter++ });
        });
      }
    });

    return blocks;
  }, [articlesToProcess, record, template]);

  // ─── Shared render helpers ──────────────────────────────────────────────────
  const renderBlock = (block: { type: string; content: string; artIdx: number; blockIdx: number }, measureMode = false) => {
    const formatContent = (txt: string) => {
      return txt
        .replace(/\*\*(.*?)\*\*/g, '<span class="font-black">$1</span>')
        .replace(/\*(.*?)\*/g, '<span class="italic text-slate-500">$1</span>');
    };

    if (block.type === 'article-header') {
      return (
        <div 
          key={block.blockIdx}
          {...(measureMode ? { 'data-measure': `block-${block.blockIdx}` } : {})}
          className="flex items-start gap-4 w-full" 
          style={{ 
            paddingBottom: '2mm', 
            paddingTop: block.blockIdx > 0 ? '5mm' : '1mm',
            overflowWrap: 'anywhere'
          }}
        >
          <h4 style={{ 
            color: colors.slate950, 
            fontSize: `${(template.fontSize || 10) - 1}pt`,
            maxWidth: '85%',
            lineHeight: '1.3',
            letterSpacing: '0.02em'
          }} className="font-black uppercase shrink-0 text-left leading-tight break-words">{block.content}</h4>
          <div className="flex-1 h-[0.5pt] bg-slate-100 mt-2.5" />
        </div>
      );
    }
    return (
      <div 
        key={block.blockIdx}
        {...(measureMode ? { 'data-measure': `block-${block.blockIdx}` } : {})}
        style={{ 
          color: colors.slate800, 
          fontSize: `${template.fontSize || 10}pt`, 
          lineHeight: template.lineHeight || 1.6, 
          textAlign: (template.alignment as any) || 'justify',
          paddingBottom: '4mm',
          overflowWrap: 'anywhere',
          letterSpacing: 'normal'
        }} 
        className="w-full text-justify whitespace-pre-line leading-relaxed break-words"
        dangerouslySetInnerHTML={{ __html: formatContent(block.content) }}
      />
    );
  };

  const renderParties = (measureMode = false) => (
    <div
      {...(measureMode ? { 'data-measure': 'parties' } : {})}
      className="w-full shrink-0"
      style={{ paddingBottom: `${SECTION_GAP_MM}mm`, paddingTop: `${SECTION_GAP_MM / 2}mm` }}
    >
      <div className="flex items-center justify-center gap-6" style={{ paddingBottom: '8mm' }}>
        <div className="flex-1 h-[0.5pt] bg-slate-200" />
        <span style={{ color: colors.slate950, letterSpacing: '0.2em' }} className="font-black uppercase text-[10pt]">{partiesIntro}</span>
        <div className="flex-1 h-[0.5pt] bg-slate-200" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8mm' }}>
        {[
          { label: template.establishmentLabel, html: establishmentContent, tag: 'Partie 1' },
          { label: template.organizationLabel,  html: organizationContent,  tag: 'Partie 2' },
          { label: template.studentLabel,       html: studentContent,        tag: 'Partie 3' },
        ].map((party, idx) => (
          <div key={idx} className="flex gap-10">
            <div className="w-24 shrink-0 flex flex-col items-end pt-1">
              <span style={{ color: colors.primary, paddingBottom: '1mm', letterSpacing: '0.05em' }} className="text-[7pt] font-black uppercase">{party.tag}</span>
              <div style={{ backgroundColor: colors.primary }} className="w-8 h-[2pt] rounded-full" />
            </div>
            <div className="flex-1">
              <h4 style={{ color: colors.slate600, paddingBottom: '3mm', letterSpacing: '0.05em' }} className="text-[8pt] font-black uppercase">{party.label}</h4>
              <div style={{ color: colors.slate900, fontSize: `${template.fontSize || 10}pt`, lineHeight: template.lineHeight || 1.5 }} className="text-justify">
                <p dangerouslySetInnerHTML={{ __html: party.html.replace(/\*\*(.*?)\*\*/g, '<span class="font-black">$1</span>').replace(/\*(.*?)\*/g, '<span class="italic text-slate-500">$1</span>') }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTitle = (measureMode = false) => (
    <div
      {...(measureMode ? { 'data-measure': 'title' } : {})}
      className="w-full text-center shrink-0"
      style={{ paddingBottom: `${SECTION_GAP_MM}mm`, paddingTop: '4mm' }}
    >
      <div className="inline-block relative">
        <h1 style={{ color: colors.slate900, paddingBottom: '2mm', letterSpacing: '0.15em' }} className="text-[20pt] font-black uppercase py-1 leading-none">
          {documentTitle}
        </h1>
      </div>
      <p style={{ color: colors.slate600, paddingTop: '6mm', letterSpacing: '0.1em' }} className="text-[10px] font-black uppercase">
        {stageType === StageType.PFE ? "Projet de Fin d'Études (PFE)" : stageType === StageType.PFA ? "Stage de Fin d'Année (PFA)" : `Stage ${stageType}`}
      </p>
    </div>
  );

  const renderSignatures = (measureMode = false) => (
    <div
      {...(measureMode ? { 'data-measure': 'signatures' } : {})}
      style={{ paddingTop: '10mm', paddingBottom: '6mm' }}
      className="w-full shrink-0 px-2"
    >
      <div className="grid grid-cols-2 gap-x-16 gap-y-20">
        {[
          { label: studentSignatureLabel,      showLu: true  },
          { label: organizationSignatureLabel, showLu: true  },
          { label: responsableSignatureLabel, showLu: false },
          { label: deanSignatureLabel,         showLu: false },
        ].map((sig, idx) => (
          <div key={idx} className="flex flex-col min-h-32 relative">
            <div className="flex items-center gap-2" style={{ paddingBottom: '2mm' }}>
              <p style={{ color: colors.slate950, letterSpacing: '0.02em' }} className="font-black text-[8.5pt] uppercase">{sig.label}</p>
            </div>
            <div className="flex-1 border-t border-slate-300 pt-3">
              <div className="space-y-1 opacity-60">
                {sig.showLu && <p style={{ color: colors.slate600, letterSpacing: '0.01em' }} className="text-[7pt] font-bold uppercase italic">{template.signatureMentionLu}</p>}
                <p style={{ color: colors.slate600, letterSpacing: '0.01em' }} className="text-[7pt] font-bold uppercase italic">
                  {idx === 3 ? "Fait à Marrakech le : ...................." : template.signatureMentionFait}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const titleVis = sortedSections.find(s => s.type === 'title')?.isVisible !== false;
  const partiesVis = sortedSections.find(s => s.type === 'parties')?.isVisible !== false;

  // ─── Off-screen measurement render ─────────────────────────────────────────
  const contentWidthMM = PAGE_W_MM - MARGIN_L_MM - MARGIN_R_MM;

  const measurementRender = (
    <div
      ref={measureRef}
      aria-hidden="true"
      style={{
        position: 'absolute', top: 0, left: '-10000px',
        width: `${contentWidthMM}mm`,
        fontSize: `${template.fontSize ?? 10}pt`,
        lineHeight: template.lineHeight ?? 1.6,
        fontFamily: 'serif',
        pointerEvents: 'none',
        textAlign: (template.alignment || 'justify') as any,
        boxSizing: 'border-box',
        overflow: 'visible'
      }}
      className="font-serif opacity-0"
    >
      {titleVis && renderTitle(true)}
      {partiesVis && renderParties(true)}

      <div className="font-serif">
        {granularBlocks.map((block, i) => renderBlock(block, true))}
      </div>

      {signaturesSection?.isVisible !== false && renderSignatures(true)}
    </div>
  );

  useEffect(() => {
    // Calibrate px to mm ratio precisely for this render context
    const testDiv = document.createElement('div');
    testDiv.style.width = '100mm';
    testDiv.style.visibility = 'hidden';
    testDiv.style.position = 'absolute';
    testDiv.style.left = '-9999px';
    document.body.appendChild(testDiv);
    const ratio = testDiv.getBoundingClientRect().width / 100;
    setPxPerMm(ratio);
    document.body.removeChild(testDiv);
  }, []);

  useEffect(() => {
    const measure = () => {
      if (!measureRef.current) return;
      const container   = measureRef.current;

      const titleEl     = container.querySelector<HTMLElement>('[data-measure="title"]');
      const partiesEl   = container.querySelector<HTMLElement>('[data-measure="parties"]');
      const sigEl       = container.querySelector<HTMLElement>('[data-measure="signatures"]');
      const blockEls    = container.querySelectorAll<HTMLElement>('[data-measure^="block-"]');

      // Calibrate the LOCAL ratio to account for any parent CSS scaling (zoom)
      // container.getBoundingClientRect().width is the scaled pixel width
      // contentWidthMM is the intended logical width in mm
      const containerRect = container.getBoundingClientRect();
      const localRatio = containerRect.width / contentWidthMM;

      // Ensure we don't divide by zero
      const effectiveRatio = localRatio > 0 ? localRatio : (pxPerMm || 3.7795275591);

      const titleH   = titleEl?.getBoundingClientRect().height   || 0;
      const partiesH = partiesEl?.getBoundingClientRect().height || 0;
      const sigH     = sigEl?.getBoundingClientRect().height     || 0;

      const tempHMm = new Array(granularBlocks.length).fill(0);
      blockEls.forEach(el => {
        const idStr = el.getAttribute('data-measure')?.replace('block-', '');
        if (idStr !== null && idStr !== undefined) {
          const idx = parseInt(idStr, 10);
          if (!isNaN(idx) && idx < tempHMm.length) {
            tempHMm[idx] = el.getBoundingClientRect().height / effectiveRatio;
          }
        }
      });
      
      // Validation: if we have granularBlocks but measured 0 for many of them, the DOM might not be ready yet.
      const meaningfulBlocksMeasured = tempHMm.filter((h, i) => h > 0 || (granularBlocks[i].content && granularBlocks[i].content.trim().length === 0)).length;
      if (granularBlocks.length > 0 && meaningfulBlocksMeasured < granularBlocks.length) {
        // If not all blocks are measured, keep trying but with an escape hatch
        const retryCount = (window as any)._measureRetryCount || 0;
        if (retryCount < 20) {
          (window as any)._measureRetryCount = retryCount + 1;
          setTimeout(measure, 300);
          return;
        }
      }
      (window as any)._measureRetryCount = 0;

      setMeasurements({
        blocks: tempHMm,
        parties: partiesH / effectiveRatio,
        title: titleH / effectiveRatio,
        sig: sigH / effectiveRatio
      });
    };

    // Use font loading API if available for more reliable measurement
    if ('fonts' in document) {
      document.fonts.ready.then(() => {
        setTimeout(measure, 500);
        setTimeout(measure, 1500); // Double check
      });
    } else {
      setTimeout(measure, 800);
    }
  }, [granularBlocks, pxPerMm, establishmentContent, organizationContent, studentContent, documentTitle, template.fontSize, template.lineHeight, template.alignment]);

  // ─── Phase 2: Paginate using mm values ──────────────────────────────────────
  let pages: any[][] = [];

  const { blocks: blockHeightsMm, parties: partiesHeightMm, title: titleHeightMm, sig: sigHeightMm } = measurements;

  if (blockHeightsMm && blockHeightsMm.length === granularBlocks.length && titleHeightMm !== null && partiesHeightMm !== null && sigHeightMm !== null) {
    const getAvailMm = (isFirstPage: boolean) => {
      const headerMM = isFirstPage ? HEADER_P1_MM : HEADER_PN_MM;
      // Buffer for browsers
      const totalFixedOverhead = headerMM + FOOTER_MM + 10 + CONTENT_PT_MM;
      return PAGE_H_MM - totalFixedOverhead - SAFETY_BUFFER_MM;
    };

    const titleVis = sortedSections.find(s => s.type === 'title')?.isVisible !== false;
    const partiesVis = sortedSections.find(s => s.type === 'parties')?.isVisible !== false;
    
    let currentPageBlocks: any[] = [];
    let usedMm = 0;

    // Helper to calculate available space
    const calcAvail = (isFirst: boolean) => {
      const h = isFirst ? HEADER_P1_MM : HEADER_PN_MM;
      const overhead = isFirst ? ((titleVis ? (titleHeightMm || 0) : 0) + (partiesVis ? (partiesHeightMm || 0) : 0)) : 0;
      // Subtract an extra buffer for footer safety + page breaks
      return PAGE_H_MM - h - FOOTER_MM - 12 - CONTENT_PT_MM - overhead - SAFETY_BUFFER_MM;
    };

    granularBlocks.forEach((block, idx) => {
      const isFirstPage = pages.length === 0;
      const availMm = calcAvail(isFirstPage);
      
      const measuredH = blockHeightsMm[idx] ?? 0;
      // Heuristic min heights: header 10mm, paragraph 4mm
      const blockMm = Math.max(measuredH, block.type === 'article-header' ? 10 : 4);
      
      let pushNow = false;

      // 1. Basic overflow check
      if (usedMm + blockMm > availMm && currentPageBlocks.length > 0) {
        pushNow = true;
      }
      
      // 2. Orphan Article Header protection: avoid header at bottom of page
      if (!pushNow && block.type === 'article-header' && currentPageBlocks.length > 0) {
        const nextIdx = idx + 1;
        if (nextIdx < granularBlocks.length) {
          const nextMeasuredH = blockHeightsMm[nextIdx] ?? 0;
          const nextBlockMm = Math.max(nextMeasuredH, 4);
          // If header and its first paragraph together don't fit, push to next page
          if (usedMm + blockMm + nextBlockMm > availMm) {
            pushNow = true;
          }
        }
      }

      if (pushNow) {
        pages.push([...currentPageBlocks]);
        currentPageBlocks = [block];
        usedMm = blockMm;
      } else {
        currentPageBlocks.push(block);
        usedMm += blockMm;
      }
    });

    if (currentPageBlocks.length > 0) {
      const isFirstPage = pages.length === 0;
      const availMm = calcAvail(isFirstPage);
      const sigVis = signaturesSection?.isVisible !== false;
      const effectiveSigHeight = sigVis ? (sigHeightMm || 40) : 0;

      // Final check for signatures integration
      if (usedMm + effectiveSigHeight + 5 > availMm && currentPageBlocks.length > 0) {
        pages.push([...currentPageBlocks]);
        if (sigVis) pages.push([]); // Signature-only page
      } else {
        pages.push([...currentPageBlocks]);
      }
    } else if (pages.length === 0) {
      // Emergency fallback if absolutely nothing was generated
      pages.push(granularBlocks);
    }
  } else {
    pages = [];
  }

  if (pages.length === 0 && granularBlocks.length > 0) {
    return (
      <>
        {measurementRender}
        <div style={{ width: '210mm', height: '297mm', backgroundColor: 'white' }} className="flex flex-col items-center justify-center gap-4 text-slate-400">
          <div className="w-12 h-12 border-4 border-slate-100 border-t-primary rounded-full animate-spin" />
          <p className="text-xs font-bold uppercase tracking-widest">Calcul de la mise en page...</p>
        </div>
      </>
    );
  }

  const renderHeader = (pageIdx: number) => {
    const isFirstPage = pageIdx === 0;
    const headerH = isFirstPage ? HEADER_P1_MM : HEADER_PN_MM;
    const sortedSections = [...(template.sections || [])].sort((a, b) => a.order - b.order);
    const headerSection = sortedSections.find(s => s.type === 'header');
    if (!headerSection?.isVisible) return null;
    return (
      <div
        style={{
          height: `${headerH}mm`,
          paddingTop:   `${MARGIN_T_MM}mm`,
          paddingLeft:  `${MARGIN_L_MM}mm`,
          paddingRight: `${MARGIN_R_MM}mm`,
          zIndex: 10,
        }}
        className="w-full shrink-0"
      >
        {isFirstPage ? (
          <div className="w-full h-full flex justify-between items-stretch pb-2 relative">
            <div className="w-[35%] flex flex-col items-start text-left pt-1 gap-1.5">
              <div className="space-y-0.5">
                <div style={{ color: colors.slate950, letterSpacing: '0.05em' }} className="text-[7.5px] font-black uppercase leading-none mb-1">Royaume du Maroc</div>
                <div style={{ color: colors.slate900, letterSpacing: 'normal' }} className="text-[10px] font-black uppercase leading-none">Université Cadi Ayyad</div>
              </div>
              <div className="space-y-0.5">
                <div style={{ color: colors.slate900, letterSpacing: 'normal' }} className="text-[9px] font-black uppercase leading-tight">
                  Faculté des Sciences<br />et Techniques Marrakech
                </div>
                <div style={{ color: colors.slate600, letterSpacing: '0.02em' }} className="text-[7.5px] font-bold uppercase pt-1">
                  Service de la Recherche<br />et de la Coopération
                </div>
              </div>
            </div>
            <div className="w-[30%] flex flex-col items-center justify-center">
              {template.logoUrl && (
                <img src={template.logoUrl} alt="Logo"
                  style={{ maxHeight: `${template.logoSize || 20}mm`, maxWidth: '100%', width: 'auto', height: 'auto', objectFit: 'contain' }}
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
            <div className="w-[35%] flex flex-col items-end pt-1">
              <div className="flex flex-col items-end space-y-2 mb-6">
                <div className="text-right">
                  <div style={{ color: colors.slate400, letterSpacing: '0.1em' }} className="text-[6.5px] font-black uppercase mb-0.5">Référence du Dossier</div>
                  <div style={{ color: colors.slate950, letterSpacing: '0.05em' }} className="text-[10px] font-black uppercase leading-none">
                    {record?.id?.toUpperCase() || 'PFE-2026-N001'}
                  </div>
                </div>
                <div className="text-right">
                  <div style={{ color: colors.slate400, letterSpacing: '0.1em' }} className="text-[6.5px] font-black uppercase mb-0.5">Année Universitaire</div>
                  <div style={{ color: colors.slate900, letterSpacing: 'normal' }} className="text-[9px] font-black uppercase leading-none">{academicYear}</div>
                </div>
              </div>
              <div className="relative flex items-center gap-3 mt-auto">
                <div style={{ width: '18mm', height: '18mm' }} className="overflow-hidden flex items-center justify-center bg-transparent">
                  <QRCodeComponent value={record?.id || 'PREVIEW'} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ borderBottom: `0.5pt solid ${colors.slate300}` }} className="w-full h-full flex justify-between items-center pb-2">
            <p style={{ color: colors.slate400, letterSpacing: '0.05em' }} className="text-[8px] font-bold uppercase">Convention de Stage - {studentName}</p>
            <p style={{ color: colors.slate400, letterSpacing: '0.05em' }} className="text-[8px] font-bold uppercase">Réf: {record?.id || `${template.referencePrefix}-XXXX`}</p>
          </div>
        )}
      </div>
    );
  };

  const renderFooter = (pageIdx: number, totalPages: number) => {
    const sortedSections = [...(template.sections || [])].sort((a, b) => a.order - b.order);
    const footerSection = sortedSections.find(s => s.type === 'footer');
    if (!footerSection?.isVisible) return null;
    return (
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, width: '100%',
          height: `${FOOTER_MM}mm`,
          borderTop: `1pt solid ${colors.slate200}`,
          paddingLeft:  `${MARGIN_L_MM}mm`,
          paddingRight: `${MARGIN_R_MM}mm`,
          zIndex: 50, backgroundColor: '#ffffff', // Solid white and high z-index to block overrun
        }}
        className="pt-4 flex flex-col shrink-0"
      >
        <div className="w-full text-center space-y-1.5 mb-2 px-12">
          {footerText.split('\n').map((line, lineIdx) => {
            const isArabic = /[\u0600-\u06FF]/.test(line);
            return (
              <div key={lineIdx} dir={isArabic ? 'rtl' : 'ltr'} style={{ color: colors.slate400, letterSpacing: isArabic ? '0' : '0.02em' }}
                className={`text-[6.5px] font-medium leading-tight ${!isArabic ? 'uppercase' : ''}`}
              >
                {line.split('|').map((part, i) => (
                  <span key={i} className="inline-flex items-center">
                    {i > 0 && <span style={{ backgroundColor: '#e2e8f0' }} className="mx-3 w-0.5 h-0.5 rounded-full" />}
                    {part.trim()}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
        <div className="absolute bottom-4 right-8">
          <span style={{ color: '#cbd5e1', letterSpacing: '0.05em' }} className="text-[7px] font-bold uppercase">
            Page {pageIdx + 1} sur {totalPages}
          </span>
        </div>
      </div>
    );
  };

  // ─── Main page render ───────────────────────────────────────────────────────
  const usableHeightOtherMM = PAGE_H_MM - HEADER_PN_MM - FOOTER_MM;
  const usableHeightP1MM = PAGE_H_MM - HEADER_P1_MM - FOOTER_MM;

  return (
    <>
      {measurementRender}
      <div ref={ref} className={`pdf-content-wrapper flex flex-col items-center gap-0 ${isPreview ? 'w-full' : ''}`}>
        {pages.map((pageBlocks, pageIdx) => {
          const isFirstPage = pageIdx === 0;
          const isLastPage  = pageIdx === pages.length - 1;
          const headerHeightMM = isFirstPage ? HEADER_P1_MM : HEADER_PN_MM;
          
          // Physical limit for the content container to avoid ANY footer overlap
          const footerReservedMM = FOOTER_MM + 5; 
          const contentMaxHeightMM = PAGE_H_MM - headerHeightMM - footerReservedMM - CONTENT_PT_MM; 

          return (
            <div
              key={pageIdx}
              style={{
                backgroundColor: colors.background, color: colors.text, padding: 0,
                transform: scale ? `scale(${scale})` : undefined,
                transformOrigin: 'top left',
                boxSizing: 'border-box'
              }}
              className="pdf-page w-[210mm] h-[297mm] relative flex flex-col font-serif shrink-0 overflow-hidden border-none shadow-none"
            >
              {/* Draft Watermark */}
              {status === WorkflowStatus.DRAFT && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
                  <div style={{ color: 'rgba(226, 232, 240, 0.4)' }} className="text-[120px] font-bold -rotate-45 uppercase tracking-[0.2em] select-none">
                    Brouillon
                  </div>
                </div>
              )}

              {renderHeader(pageIdx)}

              {/* CONTENT — LOCKED via maxHeight and overflow to prevent bleed into footer */}
              <div
                style={{
                  paddingLeft:  `${MARGIN_L_MM}mm`,
                  paddingRight: `${MARGIN_R_MM}mm`,
                  paddingTop:   `${CONTENT_PT_MM}mm`,
                  maxHeight:    `${contentMaxHeightMM}mm`,
                  overflow:     'hidden',
                  zIndex: 5,
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {isFirstPage && titleSection?.isVisible && renderTitle()}
                {isFirstPage && partiesSection?.isVisible && renderParties()}

                {articlesSection?.isVisible && pageBlocks.length > 0 && (
                  <div className="w-full">
                    <div className="font-serif">
                      {pageBlocks.map((block: any) => renderBlock(block))}
                    </div>
                  </div>
                )}

                {isLastPage && signaturesSection?.isVisible && (
                  <div className="w-full">
                    {renderSignatures()}
                  </div>
                )}
              </div>

              {renderFooter(pageIdx, pages.length)}
            </div>
          );
        })}
      </div>
    </>
  );
});
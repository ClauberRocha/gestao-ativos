import type { Asset, AssetStatus } from "./supabase";
import { formatCurrency } from "./assets";

/**
 * Generates and downloads an Excel spreadsheet (XML Spreadsheet 2003 format)
 * with complete styling, bold headers, background colors, proper column widths,
 * currency formats, and full UTF-8 Portuguese character support.
 */
export function exportAssetsToExcel(
  assets: Asset[],
  options: {
    filename?: string;
    isAdmin?: boolean;
    filterLabel?: string;
  } = {}
) {
  const {
    filename = `Inventario_Ativos_MR_PAY_${new Date().toISOString().slice(0, 10)}.xls`,
    isAdmin = false,
    filterLabel = "Todos os ativos",
  } = options;

  const now = new Date();
  const formattedDate = now.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const formattedTime = now.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const sanitizeXml = (str: string | number | null | undefined): string => {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  let rowsXml = "";

  // Title Row
  rowsXml += `
    <Row ss:Height="28">
      <Cell ss:MergeAcross="${isAdmin ? 8 : 7}" ss:StyleID="sTitle">
        <Data ss:Type="String">MR PAY · RELATÓRIO DE INVENTÁRIO PATRIMONIAL</Data>
      </Cell>
    </Row>
    <Row ss:Height="18">
      <Cell ss:MergeAcross="${isAdmin ? 8 : 7}" ss:StyleID="sSubtitle">
        <Data ss:Type="String">Emissão: ${formattedDate} às ${formattedTime} | Filtro: ${sanitizeXml(filterLabel)} | Total: ${assets.length} registros</Data>
      </Cell>
    </Row>
    <Row ss:Height="10"></Row>
  `;

  // Header Row
  rowsXml += `
    <Row ss:Height="24">
      <Cell ss:StyleID="sHeader"><Data ss:Type="String">Patrimônio</Data></Cell>
      <Cell ss:StyleID="sHeader"><Data ss:Type="String">Descrição do Ativo</Data></Cell>
      <Cell ss:StyleID="sHeader"><Data ss:Type="String">Número de Série</Data></Cell>
      <Cell ss:StyleID="sHeader"><Data ss:Type="String">Status</Data></Cell>
      <Cell ss:StyleID="sHeader"><Data ss:Type="String">Conservação</Data></Cell>
      <Cell ss:StyleID="sHeader"><Data ss:Type="String">Conta Cliente</Data></Cell>
      <Cell ss:StyleID="sHeader"><Data ss:Type="String">Localização</Data></Cell>
      ${isAdmin ? '<Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">Valor Aquisição (R$)</Data></Cell>' : ''}
      <Cell ss:StyleID="sHeader"><Data ss:Type="String">Observações</Data></Cell>
    </Row>
  `;

  // Data Rows
  assets.forEach((asset, index) => {
    const isEven = index % 2 === 0;
    const rowStyle = isEven ? "sRowEven" : "sRowOdd";
    const statusStyle = `sStatus_${asset.status.replace(/\s+/g, "_")}`;
    const valueNum = typeof asset.valor_aquisicao === "number" ? asset.valor_aquisicao : 0;

    rowsXml += `
      <Row ss:Height="20">
        <Cell ss:StyleID="${rowStyle}Bold"><Data ss:Type="String">${sanitizeXml(asset.patrimonio)}</Data></Cell>
        <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${sanitizeXml(asset.descricao)}</Data></Cell>
        <Cell ss:StyleID="${rowStyle}Mono"><Data ss:Type="String">${sanitizeXml(asset.numero_serie)}</Data></Cell>
        <Cell ss:StyleID="${statusStyle}"><Data ss:Type="String">${sanitizeXml(asset.status)}</Data></Cell>
        <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${sanitizeXml(asset.conservacao || "—")}</Data></Cell>
        <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${sanitizeXml(asset.conta_cliente || "—")}</Data></Cell>
        <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${sanitizeXml(asset.local || "—")}</Data></Cell>
        ${isAdmin ? `<Cell ss:StyleID="${rowStyle}Currency"><Data ss:Type="Number">${valueNum}</Data></Cell>` : ''}
        <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${sanitizeXml(asset.observacoes || "—")}</Data></Cell>
      </Row>
    `;
  });

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Title>Inventário de Ativos - MR Pay</Title>
    <Author>MR Pay Gestão Patrimonial</Author>
    <Created>${now.toISOString()}</Created>
  </DocumentProperties>
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Borders/>
      <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="10" ss:Color="#0F172A"/>
      <Interior/>
      <NumberFormat/>
      <Protection/>
    </Style>
    <Style ss:ID="sTitle">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Font ss:FontName="Segoe UI" ss:Size="14" ss:Bold="1" ss:Color="#0F172A"/>
      <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="sSubtitle">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Font ss:FontName="Segoe UI" ss:Size="9" ss:Italic="1" ss:Color="#64748B"/>
      <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="sHeader">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0F172A"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0F172A"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/>
      </Borders>
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="sHeaderRight">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0F172A"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0F172A"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/>
      </Borders>
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="sRowEven">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </Borders>
      <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Color="#1E293B"/>
      <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="sRowEvenBold">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </Borders>
      <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Bold="1" ss:Color="#0F172A"/>
      <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="sRowEvenMono">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </Borders>
      <Font ss:FontName="Consolas" ss:Size="9" ss:Color="#475569"/>
      <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="sRowEvenCurrency">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </Borders>
      <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Color="#1E293B"/>
      <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="&quot;R$&quot;\ #,##0.00"/>
    </Style>
    <Style ss:ID="sRowOdd">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </Borders>
      <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Color="#1E293B"/>
      <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="sRowOddBold">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </Borders>
      <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Bold="1" ss:Color="#0F172A"/>
      <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="sRowOddMono">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </Borders>
      <Font ss:FontName="Consolas" ss:Size="9" ss:Color="#475569"/>
      <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="sRowOddCurrency">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </Borders>
      <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Color="#1E293B"/>
      <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="&quot;R$&quot;\ #,##0.00"/>
    </Style>
    <Style ss:ID="sStatus_Ativo">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </Borders>
      <Font ss:FontName="Segoe UI" ss:Size="9" ss:Bold="1" ss:Color="#047857"/>
      <Interior ss:Color="#ECFDF5" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="sStatus_Em_estoque">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </Borders>
      <Font ss:FontName="Segoe UI" ss:Size="9" ss:Bold="1" ss:Color="#B45309"/>
      <Interior ss:Color="#FFFBEB" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="sStatus_Entregue">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </Borders>
      <Font ss:FontName="Segoe UI" ss:Size="9" ss:Bold="1" ss:Color="#0369A1"/>
      <Interior ss:Color="#F0F9FF" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="sStatus_Defeito">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </Borders>
      <Font ss:FontName="Segoe UI" ss:Size="9" ss:Bold="1" ss:Color="#B91C1C"/>
      <Interior ss:Color="#FEF2F2" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Inventario de Ativos">
    <Table ss:DefaultRowHeight="18">
      <Column ss:Width="110"/>
      <Column ss:Width="220"/>
      <Column ss:Width="140"/>
      <Column ss:Width="100"/>
      <Column ss:Width="100"/>
      <Column ss:Width="150"/>
      <Column ss:Width="140"/>
      ${isAdmin ? '<Column ss:Width="120"/>' : ''}
      <Column ss:Width="260"/>
      ${rowsXml}
    </Table>
    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
      <PageSetup>
        <Layout x:Orientation="Landscape"/>
        <Header x:Margin="0.3"/>
        <Footer x:Margin="0.3"/>
        <PageMargins x:Bottom="0.5" x:Left="0.5" x:Right="0.5" x:Top="0.5"/>
      </PageSetup>
      <FitToPage/>
      <Print>
        <FitWidth>1</FitWidth>
        <FitHeight>0</FitHeight>
        <ValidPrinterInfo/>
        <PaperSizeIndex>9</PaperSizeIndex>
      </Print>
      <Selected/>
      <FreezePanes/>
      <FrozenNoSplit/>
      <SplitHorizontal>4</SplitHorizontal>
      <TopRowBottomPane>4</TopRowBottomPane>
      <ActivePane>2</ActivePane>
    </WorksheetOptions>
  </Worksheet>
</Workbook>`;

  const blob = new Blob([xmlContent], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export type AssetSheetData = {
  id?: string;
  patrimonio: string;
  descricao: string;
  numero_serie: string;
  conta_cliente?: string | null;
  local?: string | null;
  status: AssetStatus;
  conservacao?: string | null;
  valor_aquisicao?: number | null;
  observacoes?: string | null;
};

/**
 * Generates an ultra high quality printable Asset Profile Sheet (Ficha do Ativo)
 * ready for printing or saving to PDF via browser print dialogue.
 */
export function exportAssetSheetPDF(
  assetData: AssetSheetData,
  options: {
    isAdmin?: boolean;
    companyName?: string;
  } = {}
) {
  const { isAdmin = false, companyName = "MR PAY MEIOS DE PAGAMENTO LTDA" } = options;

  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const statusColors: Record<AssetStatus, { bg: string; text: string; border: string }> = {
    Ativo: { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" },
    "Em estoque": { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
    Entregue: { bg: "#f0f9ff", text: "#0369a1", border: "#bae6fd" },
    Defeito: { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" },
  };

  const currentStatusStyle = statusColors[assetData.status] || statusColors["Em estoque"];

  // Create a hidden printable iframe or new window
  const printWindow = window.open("", "_blank", "width=850,height=1100");
  if (!printWindow) {
    alert("Por favor, habilite pop-ups para visualizar e salvar a Ficha em PDF.");
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Ficha do Ativo - ${assetData.patrimonio || "MR PAY"}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background-color: #ffffff;
      line-height: 1.45;
      font-size: 13px;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 14px;
      margin-bottom: 18px;
    }
    .logo-container {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-box {
      background: linear-gradient(135deg, #0077b6 0%, #0066a2 100%);
      color: white;
      font-weight: 900;
      font-size: 18px;
      padding: 8px 14px;
      border-radius: 10px;
      letter-spacing: -0.5px;
    }
    .company-meta h1 {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.3px;
    }
    .company-meta p {
      font-size: 11px;
      color: #64748b;
    }
    .doc-meta {
      text-align: right;
    }
    .doc-badge {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      padding: 4px 8px;
      border-radius: 6px;
      margin-bottom: 4px;
    }
    .doc-date {
      font-size: 11px;
      color: #64748b;
    }
    .title-banner {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 5px solid #0077b6;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .title-banner h2 {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .title-banner .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: ${currentStatusStyle.bg};
      color: ${currentStatusStyle.text};
      border: 1px solid ${currentStatusStyle.border};
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .section {
      margin-bottom: 18px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #475569;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-title::after {
      content: "";
      flex: 1;
      height: 1px;
      background: #e2e8f0;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
    }
    .card-field {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
    }
    .field-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 3px;
    }
    .field-value {
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
    }
    .field-value.highlight {
      font-size: 16px;
      font-weight: 800;
      color: #0077b6;
      font-family: "Segoe UI", Roboto, monospace;
    }
    .field-value.mono {
      font-family: Consolas, "Courier New", monospace;
      font-size: 12px;
      letter-spacing: 0.05em;
      color: #1e293b;
    }
    .barcode-container {
      margin-top: 6px;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
    }
    .fake-barcode {
      display: flex;
      height: 24px;
      gap: 2px;
      align-items: stretch;
    }
    .fake-barcode span {
      background: #0f172a;
      display: inline-block;
    }
    .observations-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      min-height: 50px;
      font-size: 12px;
      color: #334155;
      line-height: 1.5;
    }
    .terms-box {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 11px;
      color: #334155;
      line-height: 1.5;
      margin-top: 14px;
    }
    .terms-box strong {
      color: #0f172a;
    }
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 40px;
      padding-top: 10px;
    }
    .signature-block {
      text-align: center;
    }
    .signature-line {
      border-top: 1px solid #0f172a;
      margin-bottom: 6px;
      width: 100%;
    }
    .signature-role {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .signature-meta {
      font-size: 10px;
      color: #64748b;
      margin-top: 2px;
    }
    .footer {
      border-top: 1px dashed #cbd5e1;
      margin-top: 25px;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      font-size: 9.5px;
      color: #94a3b8;
    }
    .actions-bar {
      margin-bottom: 16px;
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }
    .btn {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-primary {
      background: #0077b6;
      color: #ffffff;
    }
    .btn-secondary {
      background: #e2e8f0;
      color: #0f172a;
    }
    @media print {
      .actions-bar {
        display: none !important;
      }
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="actions-bar">
      <button class="btn btn-secondary" onclick="window.close()">Fechar Janela</button>
      <button class="btn btn-primary" onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button>
    </div>

    <!-- Header -->
    <div class="header">
      <div class="logo-container">
        <div class="logo-box">mr pay</div>
        <div class="company-meta">
          <h1>${companyName}</h1>
          <p>Sistema Integrado de Gestão Patrimonial e Custódia de Ativos</p>
        </div>
      </div>
      <div class="doc-meta">
        <span class="doc-badge">FICHA DE CONTROLE</span>
        <div class="doc-date">Emissão: ${dateStr} às ${timeStr}</div>
      </div>
    </div>

    <!-- Title Banner -->
    <div class="title-banner">
      <div>
        <h2>Ficha Cadastral do Ativo</h2>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Documento oficial de rastreabilidade patrimonial</div>
      </div>
      <div class="status-badge">
        <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:currentColor;"></span>
        Status: ${assetData.status}
      </div>
    </div>

    <!-- Identificação Principal -->
    <div class="section">
      <div class="section-title">1. Identificação do Hardware / Ativo</div>
      <div class="grid-2">
        <div class="card-field" style="background:#f8fafc; border-left: 3px solid #0077b6;">
          <div class="field-label">Patrimônio / Tombamento</div>
          <div class="field-value highlight">${assetData.patrimonio || "—"}</div>
        </div>
        <div class="card-field">
          <div class="field-label">Número de Série (S/N)</div>
          <div class="field-value mono">${assetData.numero_serie || "—"}</div>
          <div class="barcode-container">
            <div class="fake-barcode">
              <span style="width:2px;"></span><span style="width:4px;margin-left:2px;"></span>
              <span style="width:1px;margin-left:1px;"></span><span style="width:3px;margin-left:3px;"></span>
              <span style="width:2px;margin-left:1px;"></span><span style="width:5px;margin-left:2px;"></span>
              <span style="width:1px;margin-left:1px;"></span><span style="width:3px;margin-left:2px;"></span>
              <span style="width:4px;margin-left:3px;"></span><span style="width:2px;margin-left:1px;"></span>
              <span style="width:3px;margin-left:2px;"></span><span style="width:1px;margin-left:3px;"></span>
              <span style="width:4px;margin-left:1px;"></span><span style="width:2px;margin-left:2px;"></span>
            </div>
          </div>
        </div>
      </div>

      <div class="grid-2" style="margin-top: 10px;">
        <div class="card-field">
          <div class="field-label">Descrição do Modelo / Especificação</div>
          <div class="field-value">${assetData.descricao || "—"}</div>
        </div>
        <div class="card-field">
          <div class="field-label">Estado de Conservação</div>
          <div class="field-value">${assetData.conservacao || "Bom / Operacional"}</div>
        </div>
      </div>
    </div>

    <!-- Alocação e Custódia -->
    <div class="section">
      <div class="section-title">2. Alocação, Custódia e Localização</div>
      <div class="grid-3">
        <div class="card-field">
          <div class="field-label">Conta / Cliente Vinculado</div>
          <div class="field-value">${assetData.conta_cliente || "Base Interna (Não alocado)"}</div>
        </div>
        <div class="card-field">
          <div class="field-label">Localização Física / Unidade</div>
          <div class="field-value">${assetData.local || "Almoxarifado Central"}</div>
        </div>
        <div class="card-field">
          <div class="field-label">Valor de Aquisição</div>
          <div class="field-value">${isAdmin && assetData.valor_aquisicao ? formatCurrency(assetData.valor_aquisicao) : "Restrito (Admin)"}</div>
        </div>
      </div>
    </div>

    <!-- Observações -->
    <div class="section">
      <div class="section-title">3. Observações Técnicas & Histórico</div>
      <div class="observations-box">
        ${assetData.observacoes || "Nenhuma observação técnica registrada para este ativo."}
      </div>
    </div>

    <!-- Termo de Responsabilidade -->
    <div class="terms-box">
      <strong>TERMO DE CUSTÓDIA E RESPONSABILIDADE PATRIMONIAL:</strong><br>
      Declaro para os devidos fins que o equipamento discriminado nesta ficha foi conferido, inspecionado e encontra-se em conformidade com as especificações e estado físico informados. O recebedor compromete-se a zelar pelo bom uso e guarda do bem, comunicando imediatamente qualquer avaria, extravio ou necessidade de manutenção.
    </div>

    <!-- Signatures -->
    <div class="signatures-grid">
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-role">Responsável pela Expedição / Conferência</div>
        <div class="signature-meta">MR Pay Operações & Logística</div>
        <div class="signature-meta">Data: ____/____/________</div>
      </div>
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-role">Responsável pelo Recebimento / Cliente</div>
        <div class="signature-meta">Nome: _______________________________</div>
        <div class="signature-meta">CPF / Matrícula: ______________________</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div>MR Pay · Gestão de Ativos Patrimoniais v1.0</div>
      <div>Autenticação do Registro: ${assetData.id || "SYS-" + Math.random().toString(36).substring(2, 10).toUpperCase()}</div>
      <div>Página 1 de 1</div>
    </div>
  </div>

  <script>
    window.addEventListener('DOMContentLoaded', () => {
      // Auto-focus print dialog after render
      setTimeout(() => {
        window.print();
      }, 400);
    });
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

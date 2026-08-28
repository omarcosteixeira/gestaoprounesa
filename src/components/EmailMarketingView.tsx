import React, { useState, useRef, useEffect } from "react";
import {
  Mail,
  Send,
  FileText,
  Image as ImageIcon,
  Upload,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Info,
  HelpCircle,
  Sparkles,
  RefreshCw,
  Users,
  Eye,
  Settings,
} from "lucide-react";
import * as XLSX from "xlsx";

interface EmailLog {
  id: string;
  timestamp: string;
  recipient: string;
  subject: string;
  status: "pending" | "success" | "error" | "opened" | "delivered";
  messageId?: string;
  error?: string;
}

export function EmailMarketingView({
  onToast,
}: {
  onToast: (m: string, t?: "success" | "error") => void;
}) {
  // Config
  const [senderName, setSenderName] = useState("Leads Pro Marketing");
  const [senderEmail, setSenderEmail] = useState(
    "estaciocomercialoeste@gmail.com",
  );
  const [subject, setSubject] = useState("");

  // Recipients
  const [recipientInput, setRecipientInput] = useState("");
  const [extractedEmails, setExtractedEmails] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Email content mode
  const [contentMode, setContentMode] = useState<"html" | "text" | "image">(
    "html",
  );

  // Body state
  const [textBody, setTextBody] = useState("");
  const [emailBody, setEmailBody] = useState(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333333; line-height: 1.6; margin: 0; padding: 0; background-color: #f8fafc; }
    .container { max-width: 600px; margin: 20px auto; padding: 40px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; }
    .header { font-size: 24px; font-weight: bold; color: #1e3a8a; margin-bottom: 20px; text-align: center; }
    .content { font-size: 16px; margin-bottom: 30px; }
    .button-container { text-align: center; margin: 30px 0; }
    .button { background-color: #2563eb; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; }
    .footer { font-size: 12px; color: #64748b; text-align: center; margin-top: 40px; border-t: 1px solid #f1f5f9; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">📋 Novidades Leads Pro</div>
    <div class="content">
      <p>Olá,</p>
      <p>Gostaríamos de apresentar nossas novas ferramentas focadas na facilitação do cadastro de leads e acompanhamento comercial de captação de alunos.</p>
      <p>Abaixo você pode ver o resumo operacional e as novas diretrizes comerciais.</p>
    </div>
    <div class="button-container">
      <a href="https://estacio.br" class="button">Acessar Portal</a>
    </div>
    <div class="footer">
      Este e-mail foi enviado por Leads Pro.<br>
      Se desejar não receber mais estes e-mails, cancele sua inscrição.
    </div>
  </div>
</body>
</html>`);

  // Image mode states
  const [attachedImageBase64, setAttachedImageBase64] = useState<string>("");
  const [attachedImageName, setAttachedImageName] = useState<string>("");
  const [imageRedirectUrl, setImageRedirectUrl] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Sending progress states
  const [isSending, setIsSending] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [sendLogs, setSendLogs] = useState<EmailLog[]>([]);
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    success: 0,
    error: 0,
  });
  const [previewOpen, setPreviewOpen] = useState(false);

  // Internal silent status verification
  const handleCheckStatusSilently = async (currentLogs?: EmailLog[]) => {
    const logsToCheck = currentLogs || sendLogs;
    const toCheck = logsToCheck.filter(
      (log) =>
        (log.status === "success" || log.status === "delivered") &&
        log.messageId,
    );
    if (toCheck.length === 0) return;

    try {
      const messageIds = toCheck.map((l) => l.messageId);
      const response = await fetch("/api/email-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.statuses) {
          let updated = 0;
          const newLogs = logsToCheck.map((log) => {
            if (log.messageId && data.statuses[log.messageId]) {
              const newStatus = data.statuses[log.messageId];
              if (log.status !== newStatus) {
                updated++;
                return { ...log, status: newStatus };
              }
            }
            return log;
          });
          if (updated > 0) {
            saveLogs(newLogs);
            onToast(
              `${updated} e-mail(s) atualizados com confirmação de abertura!`,
              "success",
            );
          }
        }
      }
    } catch (e) {
      console.debug("Silent status check error:", e);
    }
  };

  // Load logs from localStorage on mount and verify opening events
  useEffect(() => {
    const saved = localStorage.getItem("email_marketing_logs");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as EmailLog[];
        setSendLogs(parsed);
        // Silent check on load
        setTimeout(() => {
          handleCheckStatusSilently(parsed);
        }, 1500);
      } catch (e) {
        console.error("Failed to load logs from localStorage");
      }
    }
  }, []);

  // Periodic automatic poller to track customer opens in background
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isSending && !isCheckingStatus) {
        handleCheckStatusSilently();
      }
    }, 20000); // Run every 20 seconds
    return () => clearInterval(interval);
  }, [sendLogs, isSending, isCheckingStatus]);

  // Save logs to localStorage
  const saveLogs = (logs: EmailLog[]) => {
    setSendLogs(logs);
    localStorage.setItem("email_marketing_logs", JSON.stringify(logs));
  };

  const handleClearLogs = () => {
    saveLogs([]);
    onToast("Histórico limpo com sucesso!");
  };

  // Extract emails from recipientInput raw string to list
  useEffect(() => {
    const rawText = recipientInput;
    // Regex for grabbing emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const found = rawText.match(emailRegex) || [];
    // Deduplicate
    const unique = Array.from(
      new Set(found.map((e) => e.toLowerCase().trim())),
    );
    setExtractedEmails(unique);
  }, [recipientInput]);

  // Handle files when dropped or selected
  const processUploadFile = async (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension === "xlsx" || extension === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (data) {
            const workbook = XLSX.read(data, { type: "binary" });
            let textSum = "";
            workbook.SheetNames.forEach((sheetName) => {
              const worksheet = workbook.Sheets[sheetName];
              const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
              textSum += "\n" + JSON.stringify(json);
            });
            // Try searching emails within sheets content string
            const foundEmails =
              textSum.match(
                /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
              ) || [];
            if (foundEmails.length > 0) {
              const currentEmails = [
                ...extractedEmails,
                ...foundEmails.map((e) => e.toLowerCase().trim()),
              ];
              const unique = Array.from(new Set(currentEmails));
              setRecipientInput((prev) =>
                prev ? prev + "\n" + unique.join("\n") : unique.join("\n"),
              );
              onToast(
                `${foundEmails.length} e-mails identificados na planilha!`,
              );
            } else {
              onToast("Nenhum e-mail foi encontrado na planilha.", "error");
            }
          }
        } catch (err) {
          onToast("Falha ao analisar arquivo de planilha.", "error");
        }
      };
      reader.readAsBinaryString(file);
    } else if (extension === "html" || extension === "htm") {
      // If uploading HTML, we can import it into the templates
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
          setEmailBody(text);
          setContentMode("html"); // view/edit
          onToast("Layout HTML importado com sucesso no editor!");
        }
      };
      reader.readAsText(file);
    } else {
      // Treat as plain text or CSV
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
          const foundEmails =
            text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
          if (foundEmails.length > 0) {
            const unique = Array.from(
              new Set([
                ...extractedEmails,
                ...foundEmails.map((e) => e.toLowerCase().trim()),
              ]),
            );
            setRecipientInput((prev) =>
              prev ? prev + "\n" + unique.join("\n") : unique.join("\n"),
            );
            onToast(
              `${foundEmails.length} e-mails localizados no arquivo de texto/CSV!`,
            );
          } else {
            onToast("Nenhum e-mail foi detectado no arquivo.", "error");
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUploadFile(e.target.files[0]);
    }
  };

  // Convert uploaded image to Base64 to send using CID embedding
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAttachedImageName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          // Keep base64 without prefix data:image/...;base64, for Brevo format or keep raw for editor preview
          setAttachedImageBase64(event.target.result as string);
          onToast("Imagem de marketing carregada!");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const clearAttachedImage = () => {
    setAttachedImageBase64("");
    setAttachedImageName("");
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  // Prepare final body according to selection
  const getCompiledEmailBody = (): { body: string; attachments: any[] } => {
    const attachmentsList: any[] = [];
    let compiledHtml = emailBody;

    if (contentMode === "image") {
      if (!attachedImageBase64) {
        return { body: "", attachments: [] };
      }

      // Extract clean base64 data for attachment payload
      const base64Data = attachedImageBase64.split(";base64,").pop() || "";
      attachmentsList.push({
        content: base64Data,
        name: attachedImageName || "marketing-image.png",
        cid: "marketing_banner_image",
      });

      // Construct a simple responsive HTML body to display the image nicely
      compiledHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { background-color: #f1f5f9; margin: 0; padding: 0; text-align: center; }
    .card-wrap { max-width: 650px; margin: 20px auto; padding: 15px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    img { max-width: 100%; height: auto; border-radius: 8px; display: block; margin: 0 auto; }
    .cta-area { padding-top: 15px; text-align: center; }
    .link-footer { font-size: 11px; color: #94a3b8; text-align: center; margin-top: 25px; font-family: sans-serif; }
  </style>
</head>
<body>
  <div class="card-wrap">
    ${imageRedirectUrl ? `<a href="${imageRedirectUrl.trim()}" target="_blank">` : ""}
      <img src="cid:marketing_banner_image" alt="Marketing Banner" />
    ${imageRedirectUrl ? "</a>" : ""}
  </div>
  <div class="link-footer">Envio automático por Leads Pro</div>
</body>
</html>`;
    } else if (contentMode === "text") {
      if (!textBody.trim()) {
        return { body: "", attachments: [] };
      }
      const escapedText = textBody
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
      compiledHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: sans-serif; color: #333; line-height: 1.5; margin: 0; padding: 20px; }
  </style>
</head>
<body>
  <div>${escapedText}</div>
</body>
</html>`;
    }

    return { body: compiledHtml, attachments: attachmentsList };
  };

  // Trigger API route to send a single mail
  const sendIndividualEmail = async (
    recipient: string,
    subjectLine: string,
    bodyHtml: string,
    attachments: any[],
  ): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipients: [recipient],
          subject: subjectLine,
          body: bodyHtml,
          senderName,
          senderEmail,
          attachments,
        }),
      });

      const resJson = await response.json();
      if (!response.ok || !resJson.success) {
        return {
          success: false,
          error: resJson.error || "Erro desconhecido no servidor.",
        };
      }

      return { success: true, messageId: resJson.messageId };
    } catch (e: any) {
      return {
        success: false,
        error: e.message || "Erro de rede na requisição externa.",
      };
    }
  };

  const [testEmailDialogOpen, setTestEmailDialogOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState(
    "canaldonutri@gmail.com",
  );

  // Send Test Email to specified address
  const handleSendTest = async (targetEmail: string) => {
    const testTo = targetEmail;
    if (!testTo || !testTo.includes("@")) {
      onToast("Endereço de e-mail de teste inválido.", "error");
      return;
    }

    if (!subject) {
      onToast("Insira um assunto antes do envio.", "error");
      return;
    }

    const { body, attachments } = getCompiledEmailBody();
    if (!body) {
      onToast(
        "Carregue/redija o corpo ou a imagem antes de fazer o envio de teste.",
        "error",
      );
      return;
    }

    setTestEmailDialogOpen(false);
    onToast("Enviando e-mail de teste para " + testTo + "...");
    const result = await sendIndividualEmail(
      testTo,
      `[TESTE] ${subject}`,
      body,
      attachments,
    );

    if (result.success) {
      onToast("E-mail de teste enviado com sucesso para " + testTo + "!");
    } else {
      onToast(`Erro ao testar envio: ${result.error}`, "error");
    }
  };

  // Bulk send sequence
  const handleBulkSend = async () => {
    if (extractedEmails.length === 0) {
      onToast("Não existem destinatários carregados.", "error");
      return;
    }

    if (!subject) {
      onToast("Por favor, preencha o assunto do e-mail.", "error");
      return;
    }

    const { body, attachments } = getCompiledEmailBody();
    if (!body) {
      onToast("Corpo do e-mail ou imagem vazia.", "error");
      return;
    }

    setIsSending(true);
    setProgress({
      current: 0,
      total: extractedEmails.length,
      success: 0,
      error: 0,
    });

    const newLogs: EmailLog[] = [...sendLogs];

    for (let i = 0; i < extractedEmails.length; i++) {
      const email = extractedEmails[i];
      const timestamp = new Date().toLocaleString("pt-BR");

      const result = await sendIndividualEmail(
        email,
        subject,
        body,
        attachments,
      );

      const logItem: EmailLog = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp,
        recipient: email,
        subject,
        status: result.success ? "success" : "error",
        messageId: result.messageId,
        error: result.error,
      };

      newLogs.unshift(logItem); // Insert at beginning
      saveLogs([...newLogs]);

      setProgress((prev) => ({
        ...prev,
        current: i + 1,
        success: prev.success + (result.success ? 1 : 0),
        error: prev.error + (result.success ? 0 : 1),
      }));

      // Small delay between each call
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setIsSending(false);
    onToast("Envio em massa finalizado!");
  };

  const handleCheckStatus = async () => {
    const toCheck = sendLogs.filter(
      (log) =>
        (log.status === "success" || log.status === "delivered") &&
        log.messageId,
    );
    if (toCheck.length === 0) {
      onToast(
        "Não há e-mails pendentes para verificar status (abreviados por aberturas).",
      );
      return;
    }

    setIsCheckingStatus(true);
    try {
      const messageIds = toCheck.map((l) => l.messageId);
      const response = await fetch("/api/email-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds }),
      });
      const data = await response.json();
      if (data.success && data.statuses) {
        let updated = 0;
        const newLogs = sendLogs.map((log) => {
          if (log.messageId && data.statuses[log.messageId]) {
            const newStatus = data.statuses[log.messageId];
            if (log.status !== newStatus) {
              updated++;
              return { ...log, status: newStatus };
            }
          }
          return log;
        });
        if (updated > 0) {
          saveLogs(newLogs);
          onToast(`${updated} e-mails atualizados (confira aberturas)`);
        } else {
          onToast("Status atualizado (nenhuma nova mudança).", "success");
        }
      } else {
        onToast("Não foi possível verificar no momento.", "error");
      }
    } catch {
      onToast("Erro ao verificar status.", "error");
    } finally {
      setIsCheckingStatus(false);
    }
  };

  return (
    <div className="space-y-8" id="email-marketing-wrapper">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Mail className="text-blue-600" />
            Envio de e-mail Marketing (Brevo)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure seu conteúdo, adicione seus destinatários em lote e envie
            simultaneamente e com segurança.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setTestEmailDialogOpen(true);
            }}
            disabled={isSending}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all disabled:opacity-50 relative"
          >
            <Eye size={14} />
            Testar Envio
            {testEmailDialogOpen && (
              <div
                className="absolute top-12 left-0 sm:right-0 bg-white shadow-2xl border border-slate-200 rounded-xl p-4 w-72 z-50 text-left animate-in fade-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
                style={{ transformOrigin: "top right" }}
              >
                <div className="text-sm font-bold text-slate-800 mb-2">
                  E-mail de Teste
                </div>
                <input
                  type="email"
                  autoFocus
                  className="w-full text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-slate-50 mb-3"
                  placeholder="canaldonutri@gmail.com"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleSendTest(testEmailAddress)
                  }
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setTestEmailDialogOpen(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleSendTest(testEmailAddress)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm"
                  >
                    Enviar Teste
                  </button>
                </div>
              </div>
            )}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleBulkSend();
            }}
            disabled={isSending || extractedEmails.length === 0}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-100 transition-all disabled:opacity-50"
          >
            {isSending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            <span>
              {isSending
                ? `Enviando... (${progress.current}/${progress.total})`
                : "Iniciar Disparo em Massa"}
            </span>
          </button>
        </div>
      </div>

      {isSending && (
        <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl animate-pulse">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-blue-900 flex items-center gap-1.5">
              <RefreshCw size={16} className="animate-spin" /> Disparo em
              Andamento...
            </span>
            <span className="text-xs font-bold text-blue-700">
              {progress.current} / {progress.total} emails processados
            </span>
          </div>
          <div className="w-full bg-blue-200/50 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
          <div className="flex gap-4 mt-4 text-xs text-blue-800">
            <div>
              <span className="font-bold">Total:</span> {progress.total}
            </div>
            <div className="text-emerald-700">
              <span className="font-bold">Sucessos:</span> {progress.success}
            </div>
            <div className="text-rose-600">
              <span className="font-bold">Falhas:</span> {progress.error}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Config & Recipients */}
        <div className="lg:col-span-1 space-y-6">
          {/* Sender Credentials Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-3">
              <Settings className="text-blue-600" size={16} /> Configurações do
              Remetente
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Nome Remetente
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Ex: Leads Pro Comercial"
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  E-mail Remetente
                </label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="Ex: comercial@empresa.com.br"
                  className={`w-full px-4 py-2 border ${senderEmail.toLowerCase().includes("@gmail.com") || senderEmail.toLowerCase().includes("@outlook.com") || senderEmail.toLowerCase().includes("@hotmail.com") || senderEmail.toLowerCase().includes("@yahoo.com") ? "border-yellow-400 bg-yellow-50" : "border-slate-200"} rounded-xl text-xs focus:ring-1 focus:ring-blue-500 outline-none`}
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Este e-mail deve estar previamente validado na sua conta
                  Brevo.
                </p>
                {(senderEmail.toLowerCase().includes("@gmail.com") ||
                  senderEmail.toLowerCase().includes("@outlook.com") ||
                  senderEmail.toLowerCase().includes("@hotmail.com") ||
                  senderEmail.toLowerCase().includes("@yahoo.com")) && (
                  <div className="mt-2 p-2.5 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2 text-yellow-800">
                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] leading-tight">
                      <strong>Aviso:</strong> O uso de provedores gratuitos
                      (como Gmail, Outlook, Yahoo) como remetente fará com que o
                      Google bloqueie a entrega (política DMARC) ou o Brevo
                      reescreva seu endereço de envio.{" "}
                      <strong>
                        Para que os e-mails cheguem à caixa de entrada
                      </strong>
                      , utilize um domínio profissional validado no Brevo (ex:{" "}
                      <code className="font-semibold">
                        seu-nome@sua-empresa.com.br
                      </code>
                      ).
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recipients Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center justify-between border-b border-slate-50 pb-3">
              <span className="flex items-center gap-2">
                <Users className="text-blue-600" size={16} /> Destinatários
                Encontrados
              </span>
              <span className="text-[10px] bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-bold">
                {extractedEmails.length}
              </span>
            </h3>

            {/* Drag and drop zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                isDragOver
                  ? "border-blue-500 bg-blue-50/50"
                  : "border-slate-200 hover:border-blue-400 bg-slate-50/50"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".xlsx,.xls,.csv,.txt,.html"
                className="hidden"
              />
              <Upload className="mx-auto text-slate-400 mb-2" size={24} />
              <p className="text-xs font-bold text-slate-700">
                Arraste ou clique para importar
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Planilhas (.xlsx, .xls), CSV, Texto (.txt) ou HTML
              </p>
            </div>

            {/* Direct write manual paste box */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Lista de Destinatários (Cole texto ou digite)
              </label>
              <textarea
                rows={5}
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                placeholder="Insira emails separados por quebra de linha ou vírgulas. Ex: contato@empresa.com, aluno@estacio.br..."
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-1 focus:ring-blue-500 outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Todas as fontes são scanneadas em tempo real procurando e-mails
                legíveis.
              </p>
            </div>

            {extractedEmails.length > 0 && (
              <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
                {extractedEmails.map((email, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-2 text-xs font-mono text-slate-600 bg-slate-50"
                  >
                    <span className="truncate">{email}</span>
                    <button
                      onClick={() => {
                        // Simple remove
                        const cleanList = extractedEmails.filter(
                          (e) => e !== email,
                        );
                        setRecipientInput(cleanList.join("\n"));
                        onToast("E-mail removido da lista.");
                      }}
                      className="text-slate-400 hover:text-rose-500 transition-all p-0.5"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Content Builder */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            {/* Subject Input */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Assunto do E-mail
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: Campanha de Vestibular Especial • Matricule-se Já!"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Separation of formatting options: write plain text, HTML, or upload image with distinct descriptions */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500">
                Formato / Conteúdo do E-mail
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setContentMode("text")}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-1.5 text-center group ${
                    contentMode === "text"
                      ? "border-blue-600 bg-blue-50/15 text-blue-700 shadow-sm"
                      : "border-slate-100 bg-slate-50/50 text-slate-600 hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <FileText
                    className={`w-5 h-5 transition-transform group-hover:scale-110 ${contentMode === "text" ? "text-blue-600" : "text-slate-400"}`}
                  />
                  <span className="text-xs font-bold font-sans">
                    1. Escrever em Texto
                  </span>
                  <span className="text-[9px] text-slate-400 leading-none">
                    Corpo em texto simples (sem formatação HTML)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setContentMode("html")}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-1.5 text-center group ${
                    contentMode === "html"
                      ? "border-blue-600 bg-blue-50/15 text-blue-700 shadow-sm"
                      : "border-slate-100 bg-slate-50/50 text-slate-600 hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Sparkles
                    className={`w-5 h-5 transition-transform group-hover:scale-110 ${contentMode === "html" ? "text-blue-600" : "text-slate-400"}`}
                  />
                  <span className="text-xs font-bold font-sans">
                    2. Escrever em HTML
                  </span>
                  <span className="text-[9px] text-slate-400 leading-none">
                    Layout ou template responsivo personalizado
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setContentMode("image")}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-1.5 text-center group ${
                    contentMode === "image"
                      ? "border-blue-600 bg-blue-50/15 text-blue-700 shadow-sm"
                      : "border-slate-100 bg-slate-50/50 text-slate-600 hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <ImageIcon
                    className={`w-5 h-5 transition-transform group-hover:scale-110 ${contentMode === "image" ? "text-blue-600" : "text-slate-400"}`}
                  />
                  <span className="text-xs font-bold font-sans">
                    3. Enviar Imagem / Encarte
                  </span>
                  <span className="text-[9px] text-slate-400 leading-none">
                    Panfleto, imagem promocional inteira ou banner
                  </span>
                </button>
              </div>
            </div>

            {contentMode === "text" ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Conteúdo do E-mail (Texto Simples)
                  </label>
                  <textarea
                    rows={12}
                    value={textBody}
                    onChange={(e) => setTextBody(e.target.value)}
                    placeholder="Digite a mensagem do e-mail..."
                    className="w-full px-4 py-4 border border-slate-200 rounded-xl text-sm focus:ring-1 focus:ring-blue-500 outline-none resize-y"
                  />
                </div>
              </div>
            ) : contentMode === "html" ? (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-500">
                      Editor de Código HTML do E-mail
                    </label>
                    <button
                      onClick={() => setPreviewOpen(!previewOpen)}
                      className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
                    >
                      <Eye size={12} />{" "}
                      {previewOpen ? "Ocultar Preview" : "Mostrar Preview"}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      className={
                        previewOpen ? "md:col-span-1" : "md:col-span-2"
                      }
                    >
                      <textarea
                        rows={16}
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        className="w-full px-4 py-4 border border-slate-200 rounded-xl text-xs font-mono focus:ring-1 focus:ring-blue-500 bg-slate-900 text-slate-100 outline-none"
                      />
                    </div>
                    {previewOpen && (
                      <div className="border border-slate-200 rounded-xl bg-slate-50 p-2 overflow-auto max-h-[340px] md:max-h-[384px]">
                        <p className="text-[10px] font-bold text-slate-400 mb-1 border-b pb-1">
                          Visualização Prévia
                        </p>
                        <iframe
                          srcDoc={emailBody}
                          title="Preview"
                          sandbox="allow-same-origin"
                          className="w-full h-[320px] bg-white border border-slate-100 rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 border border-dashed border-slate-200 p-6 rounded-2xl bg-slate-50/50">
                <div className="max-w-md mx-auto text-center space-y-4">
                  {attachedImageBase64 ? (
                    <div className="space-y-3">
                      <img
                        src={attachedImageBase64}
                        alt="Preview upload"
                        className="max-h-56 mx-auto rounded-xl object-contain border bg-white border-slate-100 shadow-sm"
                      />
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-xs font-bold text-slate-500 truncate max-w-xs">
                          {attachedImageName}
                        </span>
                        <button
                          onClick={clearAttachedImage}
                          className="text-xs text-rose-500 font-bold flex items-center gap-1 hover:underline"
                        >
                          <Trash2 size={12} /> Excluir
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => imageInputRef.current?.click()}
                      className="border border-spacing-2 border-dashed border-slate-300 p-8 rounded-2xl hover:border-blue-500 cursor-pointer transition-all bg-white shadow-sm"
                    >
                      <input
                        type="file"
                        ref={imageInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <ImageIcon
                        className="mx-auto text-slate-400 mb-2"
                        size={36}
                      />
                      <p className="text-xs font-bold text-slate-800">
                        Carregar Imagem de Marketing
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Carregue um encarte publicitário, JPG ou PNG de até 15MB
                      </p>
                    </div>
                  )}

                  <div className="text-left space-y-2 mt-4 pt-4 border-t border-slate-200">
                    <label className="block text-xs font-bold text-slate-500">
                      Link de redirecionamento (Opcional)
                    </label>
                    <input
                      type="url"
                      value={imageRedirectUrl}
                      onChange={(e) => setImageRedirectUrl(e.target.value)}
                      placeholder="Ex: https://vestibular.estacio.br/cadastro?promotor=12"
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Se preenchido, o e-mail redirecionará o lead para este
                      site ao clicar na imagem.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-100 text-amber-900 rounded-2xl p-4 text-xs space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-amber-800">
                <Info size={14} /> Recomendações importantes para disparos:
              </span>
              <ul className="list-disc pl-5 space-y-0.5 text-slate-600 mt-1">
                <li>
                  O limite diário de envio depende do plano contratado em sua
                  conta da Brevo.
                </li>
                <li>
                  Mantenha um intervalo prudente de disparos para evitar
                  bloqueios de SPAM e garantir melhor ranqueamento.
                </li>
                <li>
                  Utilize o recurso de{" "}
                  <strong className="text-slate-800">Cid attachments</strong>{" "}
                  automáticos construídos no sistema que garantem exibição
                  automática de imagens no Gmail e Outlook sem necessitar
                  hospedagem externa.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* History and Logs panel */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b pb-3 border-slate-50">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <CheckCircle2 className="text-emerald-500" size={16} /> Histórico de
            Disparos de E-mail
          </h3>
          <div className="flex items-center gap-4">
            {sendLogs.length > 0 && (
              <button
                onClick={handleCheckStatus}
                disabled={isCheckingStatus}
                className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw
                  size={12}
                  className={isCheckingStatus ? "animate-spin" : ""}
                />{" "}
                Atualizar Status
              </button>
            )}
            {sendLogs.length > 0 && (
              <button
                onClick={handleClearLogs}
                className="text-xs text-rose-500 font-bold hover:underline flex items-center gap-1"
              >
                <Trash2 size={12} /> Limpar logs
              </button>
            )}
          </div>
        </div>

        {sendLogs.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl text-slate-400 text-xs">
            Nenhum disparo de e-mail marketing realizado recentemente neste
            navegador.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-500 divide-y divide-slate-100">
              <thead className="text-[10px] text-slate-400 uppercase bg-slate-50 font-bold">
                <tr>
                  <th scope="col" className="px-6 py-3 rounded-l-lg">
                    Horário
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Destinatário
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Assunto
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 rounded-r-lg">
                    Identificador / Detalhes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sendLogs.slice(0, 50).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                      {log.timestamp}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-700">
                      {log.recipient}
                    </td>
                    <td className="px-6 py-4 text-slate-600 truncate max-w-xs">
                      {log.subject}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === "opened"
                            ? "bg-emerald-100 text-emerald-700"
                            : log.status === "delivered"
                              ? "bg-teal-100 text-teal-700"
                              : log.status === "success"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {log.status === "opened"
                          ? "Aberto"
                          : log.status === "delivered"
                            ? "Entregue"
                            : log.status === "success"
                              ? "Enviado"
                              : "Falha"}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-[10px] text-slate-400">
                      {log.status === "error" ? (
                        <span
                          className="text-rose-500 truncate max-w-sm block"
                          title={log.error}
                        >
                          {log.error || "Falha de requisição"}
                        </span>
                      ) : (
                        <span className="text-slate-500">
                          ID: {log.messageId || "Sem ID"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sendLogs.length > 50 && (
              <p className="text-[10px] text-slate-400 text-center mt-3">
                Exibindo os 50 registros mais recentes.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

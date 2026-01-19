import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";

import HeaderBar from "./HeaderBar";
import FileExplorer from "./FileExplorer";
import EditorArea from "./EditorArea";
import TerminalPanel from "./TerminalPanel";
import ChatPanel from "./ChatPanel";

import {
  clearActiveProject,
  getActiveProject,
  logout,
} from "../auth/auth";

const LANGUAGE_MAP = { py: "python", java: "java" };

function IDELayout() {
  const navigate = useNavigate();

  // Panel toggles
  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [isRightOpen, setIsRightOpen] = useState(true);
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);

  const [fileTree, setFileTree] = useState([]);
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);

  const [selectedItemType, setSelectedItemType] = useState(null);
  const [selectedFolderId, setSelectedFolderId] = useState(null);

  const [terminalLines, setTerminalLines] = useState([
    "Welcome to Web IDE Terminal (MVP)",
    "Type 'help' to see commands.",
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const isRunningRef = useRef(false);
  const wsRef = useRef(null);
  const wsOpenedRef = useRef(false);
  const stopRequestedRef = useRef(false);

  const activeProject = getActiveProject();
  const projectId = activeProject?.id ?? null;

  const setRunning = useCallback((next) => {
    isRunningRef.current = next;
    setIsRunning(next);
  }, []);

  const appendTerminalLine = useCallback((line) => {
    setTerminalLines((prev) => [...prev, line]);
  }, []);

  const handleTerminalCommand = useCallback((raw) => {
    const cmd = raw.trim();
    if (!cmd) return;

    setTerminalLines((prev) => [...prev, `> ${cmd}`]);

    if (cmd === "help") {
      setTerminalLines((prev) => [
        ...prev,
        "Commands:",
        "  help  - show commands",
        "  clear - clear terminal",
        "  echo <text> - print text",
      ]);
      return;
    }

    if (cmd === "clear") {
      setTerminalLines([]);
      return;
    }

    if (cmd.startsWith("echo ")) {
      const text = cmd.slice(5);
      setTerminalLines((prev) => [...prev, text]);
      return;
    }

    setTerminalLines((prev) => [...prev, `Command not found: ${cmd}`]);
  }, []);

  const fetchJson = useCallback(async (url, options = {}) => {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }

    return res.json();
  }, []);

  const buildTree = useCallback((items) => {
    const nodes = new Map();

    items.forEach((item) => {
      const isFile = String(item.type).toUpperCase() === "FILE";
      const node = isFile
        ? {
            id: item.id,
            type: "file",
            title: item.name,
          }
        : {
            id: item.id,
            type: "folder",
            name: item.name,
            children: [],
          };
      nodes.set(item.id, { ...node, parentId: item.parentId });
    });

    const roots = [];

    nodes.forEach((node) => {
      const parentId = node.parentId;
      if (!parentId || parentId === node.id || !nodes.has(parentId)) {
        roots.push(node);
        return;
      }

      const parent = nodes.get(parentId);
      if (parent.type === "folder") {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, []);

  useEffect(() => {
    if (!projectId) {
      appendTerminalLine("Project not selected.");
      return;
    }

    let isMounted = true;

    const loadTree = async () => {
      try {
        const data = await fetchJson(`/api/files/project/${projectId}/tree`);
        if (!isMounted) return;
        setFileTree(buildTree(Array.isArray(data) ? data : []));
      } catch (err) {
        if (!isMounted) return;
        appendTerminalLine(`파일 트리 로드 실패: ${err.message}`);
      }
    };

    loadTree();

    return () => {
      isMounted = false;
    };
  }, [appendTerminalLine, buildTree, fetchJson, projectId]);

  const handleOpenFile = useCallback(
    async (file) => {
      if (!file?.id) return;
      setSelectedItemType("file");
      setSelectedFolderId(null);

      setActiveTabId(file.id);

      try {
        const meta = await fetchJson(`/api/files/${file.id}`);
        if (meta?.isDeleted) {
          appendTerminalLine("삭제된 파일입니다.");
          return;
        }

        const title = meta?.name || file.title || file.name || "Untitled";

        setTabs((prevTabs) => {
          const exists = prevTabs.some((t) => t.id === file.id);
          if (exists) {
            return prevTabs.map((t) =>
              t.id === file.id ? { ...t, title } : t
            );
          }
          return [
            ...prevTabs,
            {
              id: file.id,
              title,
              content: "",
              savedContent: "",
              isLoading: true,
            },
          ];
        });

        const data = await fetchJson(`/api/file-contents/file/${file.id}`);
        const content = data?.content ?? "";

        setTabs((prevTabs) =>
          prevTabs.map((t) =>
            t.id === file.id
              ? {
                  ...t,
                  content,
                  savedContent: content,
                  isLoading: false,
                }
              : t
          )
        );
      } catch (err) {
        appendTerminalLine(`파일 열기 실패: ${err.message}`);
        setTabs((prevTabs) =>
          prevTabs.map((t) =>
            t.id === file.id ? { ...t, isLoading: false } : t
          )
        );
      }
    },
    [appendTerminalLine, fetchJson]
  );

  const handleChangeActiveTab = (tabId) => {
    setActiveTabId(tabId);
    setSelectedItemType("file");
    setSelectedFolderId(null);
  };

  const handleSelectFolder = (folderId) => {
    setSelectedItemType("folder");
    setSelectedFolderId(folderId);
  };

  const handleCloseTab = (tabId) => {
    const tab = tabs.find((t) => t.id === tabId);
    const isDirty = tab && tab.content !== tab.savedContent;

    if (isDirty) {
      const ok = window.confirm(
        "You have unsaved changes. Close this tab anyway?"
      );
      if (!ok) return;
    }

    setTabs((prevTabs) => {
      const index = prevTabs.findIndex((t) => t.id === tabId);
      const nextTabs = prevTabs.filter((t) => t.id !== tabId);

      if (activeTabId !== tabId) return nextTabs;

      if (nextTabs.length === 0) {
        setActiveTabId(null);
        setSelectedItemType(null);
        return nextTabs;
      }

      const nextIndex = Math.max(0, index - 1);
      setActiveTabId(nextTabs[nextIndex].id);
      return nextTabs;
    });
  };

  const handleChangeContent = (nextContent) => {
    setTabs((prevTabs) =>
      prevTabs.map((t) =>
        t.id === activeTabId ? { ...t, content: nextContent } : t
      )
    );
  };

  const handleSaveActiveTab = useCallback(async () => {
    if (!activeTabId || selectedItemType !== "file") return;
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab) return;

    try {
      await fetchJson("/api/file-contents", {
        method: "POST",
        body: JSON.stringify({ fileId: tab.id, content: tab.content }),
      });

      setTabs((prevTabs) =>
        prevTabs.map((t) =>
          t.id === activeTabId ? { ...t, savedContent: t.content } : t
        )
      );
      appendTerminalLine("Saved.");
    } catch (err) {
      appendTerminalLine(`저장 실패: ${err.message}`);
    }
  }, [activeTabId, appendTerminalLine, fetchJson, selectedItemType, tabs]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const isSave =
        (isMac && e.metaKey && e.key.toLowerCase() === "s") ||
        (!isMac && e.ctrlKey && e.key.toLowerCase() === "s");

      if (!isSave) return;

      e.preventDefault();
      handleSaveActiveTab();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSaveActiveTab]);

  const activeTab = tabs.find((t) => t.id === activeTabId) || null;
  const activeFilename = activeTab?.title || "";
  const extension = activeFilename.includes(".")
    ? activeFilename.split(".").pop().toLowerCase()
    : "";
  const activeLanguage = LANGUAGE_MAP[extension] || null;

  const isFileSelected = selectedItemType === "file" && Boolean(activeTabId);
  const isRunnableLanguage = Boolean(activeLanguage);
  const isRunDisabled = !isFileSelected || !isRunnableLanguage || isRunning;
  const isStopDisabled = !isRunning;
  const isSaveDisabled = !isFileSelected;

  let runDisabledReason = "";
  if (!isFileSelected) {
    runDisabledReason =
      selectedItemType === "folder"
        ? "폴더는 실행할 수 없어요."
        : "파일을 선택하세요.";
  } else if (!isRunnableLanguage) {
    runDisabledReason = "python/java 파일만 실행 가능해요.";
  } else if (isRunning) {
    runDisabledReason = "실행 중...";
  }

  const cleanupSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, "cleanup");
      wsRef.current = null;
    }
  }, []);

  const handleRun = useCallback(() => {
    if (isRunDisabled || !activeTab || !activeLanguage) return;
    if (isRunningRef.current) return;

    cleanupSocket();
    stopRequestedRef.current = false;
    wsOpenedRef.current = false;
    setRunning(true);

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${protocol}://${window.location.host}/ws/compile`;
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      wsOpenedRef.current = true;
      const payload = {
        language: activeLanguage,
        filename: activeTab.title,
        code: activeTab.content,
      };
      socket.send(JSON.stringify(payload));
    };

    socket.onmessage = (event) => {
      const raw = event.data;
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.output) {
            appendTerminalLine(parsed.output);
            return;
          }
          if (parsed?.message) {
            appendTerminalLine(parsed.message);
            return;
          }
          if (parsed?.error) {
            appendTerminalLine(`Error: ${parsed.error}`);
            return;
          }
          appendTerminalLine(JSON.stringify(parsed));
          return;
        } catch {
          appendTerminalLine(raw);
          return;
        }
      }

      appendTerminalLine(String(raw));
    };

    socket.onerror = () => {
      if (wsOpenedRef.current) {
        appendTerminalLine("실행 중단됨");
        stopRequestedRef.current = true;
      } else {
        appendTerminalLine("WebSocket 연결 실패");
      }
      setRunning(false);
      wsRef.current = null;
    };

    socket.onclose = () => {
      wsRef.current = null;
      if (stopRequestedRef.current) {
        stopRequestedRef.current = false;
        return;
      }
      if (isRunningRef.current) {
        appendTerminalLine("실행 중단됨");
        setRunning(false);
      }
    };
  }, [
    activeLanguage,
    activeTab,
    appendTerminalLine,
    cleanupSocket,
    isRunDisabled,
    setRunning,
  ]);

  const handleStop = useCallback(() => {
    if (!isRunningRef.current) return;
    stopRequestedRef.current = true;
    appendTerminalLine("실행 중단됨");
    setRunning(false);
    cleanupSocket();
  }, [appendTerminalLine, cleanupSocket, setRunning]);

  useEffect(() => {
    return () => {
      cleanupSocket();
    };
  }, [cleanupSocket]);

  const handleLogout = () => {
    logout();
    clearActiveProject();
    navigate("/login", { replace: true });
  };

  return (
    <div
      className="ide-root"
      style={{
        gridTemplateRows: `
          48px
          1fr
          ${isTerminalOpen ? "180px" : "0px"}
        `,
      }}
    >
      <div className="ide-header">
        <HeaderBar
          onToggleLeft={() => setIsLeftOpen((x) => !x)}
          onToggleRight={() => setIsRightOpen((x) => !x)}
          onToggleTerminal={() => setIsTerminalOpen((x) => !x)}
          onRun={handleRun}
          onStop={handleStop}
          onSave={handleSaveActiveTab}
          isRunDisabled={isRunDisabled}
          isStopDisabled={isStopDisabled}
          isSaveDisabled={isSaveDisabled}
          runDisabledReason={runDisabledReason}
          onLogout={handleLogout}
          user={{ name: "developer" }}
        />
      </div>

      <div
        className="ide-body"
        style={{
          gridTemplateColumns: `
            ${isLeftOpen ? "240px" : "0px"}
            1fr
            ${isRightOpen ? "320px" : "0px"}
          `,
        }}
      >
        <aside className={`ide-left ${isLeftOpen ? "" : "closed"}`}>
          <FileExplorer
            files={fileTree}
            onOpenFile={handleOpenFile}
            openTabs={tabs}
            activeTabId={activeTabId}
            selectedFolderId={selectedFolderId}
            onSelectFolder={handleSelectFolder}
          />
        </aside>

        <main className="ide-center">
          <EditorArea
            tabs={tabs}
            activeTabId={activeTabId}
            onChangeActiveTab={handleChangeActiveTab}
            onCloseTab={handleCloseTab}
            onChangeContent={handleChangeContent}
          />
        </main>

        <aside className={`ide-right ${isRightOpen ? "" : "closed"}`}>
          <ChatPanel />
        </aside>
      </div>

      <div className={`ide-bottom ${isTerminalOpen ? "" : "closed"}`}>
        <TerminalPanel
          lines={terminalLines}
          onSubmitCommand={handleTerminalCommand}
        />
      </div>
    </div>
  );
}

export default IDELayout;

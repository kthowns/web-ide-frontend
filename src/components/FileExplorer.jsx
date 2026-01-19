import { useState } from "react";

function FileExplorer({
  files,
  onOpenFile,
  openTabs = [],
  activeTabId,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  selectedFolderId,
  onSelectFolder,
}) {
  const [expanded, setExpanded] = useState(() => new Set());

  const isOpenFile = (fileId) => openTabs.some((t) => t.id === fileId);

  return (
    <div style={{ padding: 8 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button
          type="button"
          className="file-action-btn"
          onClick={onCreateFile}
        >
          + New File
        </button>

        <button
          type="button"
          className="file-action-btn"
          onClick={onCreateFolder}
        >
          + New Folder
        </button>

        <button
          type="button"
          className="file-action-btn"
          onClick={() => {
            if (!activeTabId) {
              alert("Select a file first.");
              return;
            }
            onDeleteFile?.(activeTabId);
          }}
        >
          Delete
        </button>
      </div>

      <div style={{ fontWeight: 700, marginBottom: 8 }}>EXPLORER</div>

      {files.map((node) => (
        <TreeNode
          key={node.type === "folder" ? `d:${node.id}` : `f:${node.id}`}
          node={node}
          depth={0}
          onOpenFile={onOpenFile}
          isOpenFile={isOpenFile}
          activeTabId={activeTabId}
          expanded={expanded}
          setExpanded={setExpanded}
          selectedFolderId={selectedFolderId}
          onSelectFolder={onSelectFolder}
        />
      ))}
    </div>
  );
}

function TreeNode({
  node,
  depth,
  onOpenFile,
  isOpenFile,
  activeTabId,
  expanded,
  setExpanded,
  selectedFolderId,
  onSelectFolder,
}) {
  const paddingLeft = 8 + depth * 14;

  if (node.type === "folder") {
    const isExpanded = expanded.has(node.id);
    const isSelected = selectedFolderId === node.id;

    const toggleFolder = () => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        return next;
      });
    };

    return (
      <div>
        <button
          type="button"
          onClick={() => {
            toggleFolder();
            onSelectFolder?.(node.id);
          }}
          style={{
            width: "100%",
            textAlign: "left",
            padding: "6px 8px",
            paddingLeft,
            border: "none",
            background: isSelected ? "rgba(59, 130, 246, 0.25)" : "transparent",
            cursor: "pointer",
            fontWeight: 700,
            color: "inherit",
            borderRadius: 6,
          }}
        >
          {isExpanded ? "-" : "+"} {node.name}
        </button>

        {isExpanded && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeNode
                key={child.type === "folder" ? `d:${child.id}` : `f:${child.id}`}
                node={child}
                depth={depth + 1}
                onOpenFile={onOpenFile}
                isOpenFile={isOpenFile}
                activeTabId={activeTabId}
                expanded={expanded}
                setExpanded={setExpanded}
                selectedFolderId={selectedFolderId}
                onSelectFolder={onSelectFolder}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const opened = isOpenFile(node.id);
  const active = activeTabId === node.id;
  const title = node.title || node.name || "Untitled";

  return (
    <button
      type="button"
      onClick={() => onOpenFile?.(node)}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "6px 8px",
        paddingLeft,
        border: "none",
        borderRadius: 6,
        background: active ? "rgba(255,255,255,0.10)" : "transparent",
        cursor: "pointer",
        fontWeight: opened ? 700 : 400,
        color: "inherit",
      }}
    >
      <span style={{ display: "inline-block", width: 18 }}>
        {opened ? "*" : " "}
      </span>
      {title}
    </button>
  );
}

export default FileExplorer;

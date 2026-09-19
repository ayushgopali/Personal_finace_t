// PhotoModal — the wallet photo/ID upload dialog (dropzone + browse).
export default function PhotoModal({
  open, dragging, fileInputRef,
  onClose, onFile, onDragEnter, onDragOver, onDragLeave, onDrop
}) {
  return (
    <div className={`wallet-upload-modal${open ? ' is-open' : ''}`} id="walletUploadModal" aria-hidden={open ? 'false' : 'true'}>
      <div className="wallet-upload-card" role="dialog" aria-modal="true" aria-labelledby="walletUploadTitle">
        <button type="button" className="wallet-upload-close" id="walletUploadClose" aria-label="Close upload panel" onClick={onClose}>x</button>
        <span className="wallet-kicker">Photo / ID</span>
        <h2 id="walletUploadTitle">Add wallet ID</h2>
        <p>Choose an image or drag and drop it here.</p>
        <label
          className={`wallet-dropzone${dragging ? ' is-dragging' : ''}`}
          id="walletDropzone"
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <input
            type="file"
            accept="image/*"
            id="photoInput"
            ref={fileInputRef}
            onChange={e => {
              onFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <span className="ui-icon icon-card" aria-hidden="true" />
          <strong>Drop image here</strong>
          <small>or click to browse from your device</small>
        </label>
      </div>
    </div>
  );
}

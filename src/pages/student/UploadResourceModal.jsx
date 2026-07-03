import { useRef, useState } from "react";
import FormField from "../../components/common/FormField.jsx";
import { uploadNewResource } from "../../services/resourceService.js";

export default function UploadResourceModal({
  formData,
  setFormData,
  onClose,
  onSuccess,
  subject,
}) {
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    const val = files ? files[0] : value;
    setFormData((prev) => {
      const next = { ...prev, [name]: val };
      if (name === "type" && val !== "Lecture") {
        next.duration = "";
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description || '',
        subject_id: formData.subject_id,
        type: formData.type,
        duration: formData.duration || '00:00',
        file_url: null,
        external_url: formData.uploadMethod === 'link' ? formData.url : null,
      };

      console.log("Sending payload to DB:", payload);

      const fileToUpload = formData.uploadMethod === 'file' ? formData.file : null;
      await uploadNewResource(payload, fileToUpload);
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="student-upload-modal__overlay" onClick={onClose}>
      <div className="student-upload-modal__content" onClick={(e) => e.stopPropagation()}>
        <header className="student-upload-modal__header">
          <h2>Upload Study Material</h2>
          <button type="button" className="student-upload-modal__close" onClick={onClose} aria-label="Close modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="student-upload-modal__form">
          <div className="student-upload-modal__field">
            <label style={{ color: "#cbd5e1", marginBottom: "8px", fontSize: "0.9rem", fontWeight: "500", display: "block" }}>Resource Title</label>
            <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="e.g. OS Chapter 1 Notes" required style={{ boxSizing: "border-box", background: "#13131a", border: "1px solid #2d2d3f", color: "white", padding: "14px", borderRadius: "10px", width: "100%" }} />
          </div>

          <div className="student-upload-modal__field">
            <label style={{ color: "#cbd5e1", marginBottom: "8px", fontSize: "0.9rem", fontWeight: "500", display: "block" }}>Type</label>
            <select name="type" value={formData.type || ""} onChange={handleChange} className="student-upload-modal__select">
              <option value="">Select Category</option>
              <option value="Lecture">Lecture</option>
              <option value="Notes">Notes</option>
              <option value="PYQ">PYQ</option>
            </select>
          </div>

          {formData.type === 'Lecture' && (
            <FormField id="duration" label="Duration (HH:MM)">
              <input type="text" name="duration" value={formData.duration || ''} onChange={handleChange} placeholder="00:00" />
            </FormField>
          )}

          <div className="student-upload-modal__col-span-2">
            <label style={{ color: "#cbd5e1", marginBottom: "8px", fontSize: "0.9rem", fontWeight: "500", display: "block" }}>Subject</label>
            <div style={{ background: "#13131a", border: "1px solid #2d2d3f", color: "white", padding: "14px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "8px", boxSizing: "border-box" }}>
              <span style={{ fontWeight: "600" }}>{subject?.name || subject?.subject_name || "Selected Subject"}</span>
              {subject?.code && <span style={{ color: "#8b5cf6", fontSize: "0.8rem" }}>({subject?.code || subject?.subject_code || ""})</span>}
              <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#64748b" }}>Locked</span>
            </div>
          </div>

          <div className="student-upload-modal__col-span-2">
            <label style={{ color: "#cbd5e1", marginBottom: "8px", fontSize: "0.9rem", fontWeight: "500", display: "block" }}>Description (Optional)</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows={3} placeholder="Add details..." style={{ boxSizing: "border-box", background: "#13131a", border: "1px solid #2d2d3f", color: "white", padding: "14px", borderRadius: "10px", resize: "vertical", width: "100%" }} />
          </div>

          <div className="student-upload-modal__col-span-2">
            <span style={{ color: "#cbd5e1", marginBottom: "8px", fontSize: "0.9rem", fontWeight: "500", display: "block" }}>Upload Method</span>
            <div className="student-upload-modal__radios">
              <label>
                <input type="radio" name="uploadMethod" value="file" checked={formData.uploadMethod === "file"} onChange={handleChange} />
                <span>Upload File</span>
              </label>
              <label>
                <input type="radio" name="uploadMethod" value="link" checked={formData.uploadMethod === "link"} onChange={handleChange} />
                <span>Provide Link</span>
              </label>
            </div>
          </div>

          <div className="student-upload-modal__col-span-2">
            {formData.uploadMethod === "file" ? (
              <div className="student-upload-modal__field">
                <label style={{ color: "#cbd5e1", marginBottom: "8px", fontSize: "0.9rem", fontWeight: "500", display: "block" }}>File</label>
                <input type="file" ref={fileInputRef} onChange={handleChange} name="file" style={{ boxSizing: "border-box", background: "#13131a", border: "1px solid #2d2d3f", color: "white", padding: "14px", borderRadius: "10px", width: "100%" }} />
                {formData.file && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginTop: "12px", padding: "10px 16px", backgroundColor: "rgba(31, 41, 55, 0.7)", borderRadius: "8px", border: "1px solid rgba(75, 85, 99, 0.6)" }}>
                    <span style={{ color: "#d1d5db", fontSize: "0.875rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {formData.file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, file: null }))}
                      style={{ backgroundColor: "rgba(239, 68, 68, 0.2)", color: "#fca5a5", border: "none", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}
                      title="Clear file"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="student-upload-modal__field">
                <label style={{ color: "#cbd5e1", marginBottom: "8px", fontSize: "0.9rem", fontWeight: "500", display: "block" }}>URL</label>
                <input type="url" name="url" value={formData.url} onChange={handleChange} placeholder="Paste Drive/YouTube link..." style={{ boxSizing: "border-box", background: "#13131a", border: "1px solid #2d2d3f", color: "white", padding: "14px", borderRadius: "10px", width: "100%" }} />
              </div>
            )}
          </div>

          <div className="student-upload-modal__col-span-2">
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px", paddingTop: "16px", borderTop: "1px solid #2d2d3f" }}>
              <button type="button" onClick={onClose} style={{ background: "rgba(255,255,255,0.05)", color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.1)", padding: "12px 24px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px", fontFamily: "inherit", transition: "all 0.2s ease" }}>Cancel</button>
              <button type="submit" disabled={isLoading} style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white", padding: "12px 24px", border: "none", borderRadius: "8px", fontWeight: "600", cursor: isLoading ? "not-allowed" : "pointer", opacity: isLoading ? 0.5 : 1, fontSize: "14px", fontFamily: "inherit", transition: "all 0.2s ease" }}>{isLoading ? "Uploading..." : "Publish Material"}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import './OutreachComposerModal.css';

const toWhatsappNumber = (phone) => {
    const digits = (phone || '').replace(/\D/g, '');
    if (digits.startsWith('880')) return digits;
    if (digits.startsWith('0')) return `880${digits.slice(1)}`;
    return digits;
};

const OutreachComposerModal = ({ customer, onClose, onSent }) => {
    const [loading, setLoading] = useState(true);
    const [genError, setGenError] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [whatsappText, setWhatsappText] = useState('');
    const [channel, setChannel] = useState('email');
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState('');

    const generate = async () => {
        setLoading(true);
        setGenError('');
        setSendError('');
        try {
            const res = await fetch('/api/outreach/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId: customer.id }),
            });
            if (!res.ok) throw new Error('Failed to generate message');
            const data = await res.json();
            setEmailSubject(data.emailSubject || '');
            setEmailBody(data.emailBody || '');
            setWhatsappText(data.whatsappText || '');
        } catch {
            setGenError('Could not generate a message. You can still write one manually below.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        generate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customer.id]);

    const handleSend = async () => {
        if (channel === 'whatsapp') {
            const number = toWhatsappNumber(customer.phone);
            const url = `https://wa.me/${number}?text=${encodeURIComponent(whatsappText)}`;
            window.open(url, '_blank', 'noopener,noreferrer');
            onSent?.(`Opened WhatsApp for ${customer.name} — send it from there`);
            onClose();
            return;
        }

        setSending(true);
        setSendError('');
        try {
            const res = await fetch('/api/outreach/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: customer.id,
                    channel: 'email',
                    subject: emailSubject,
                    message: emailBody,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Send failed');

            onSent?.(`Sent via Email to ${customer.name}`);
            onClose();
        } catch (error) {
            setSendError(error.message || 'Failed to send. Please try again.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="oc-overlay" onClick={onClose}>
            <div className="oc-modal" onClick={(e) => e.stopPropagation()}>
                <div className="oc-header">
                    <div className="oc-header-left">
                        <div className="oc-avatar">{customer.name.charAt(0).toUpperCase()}</div>
                        <div>
                            <h2 className="oc-name">{customer.name}</h2>
                            <span className="oc-email">{customer.email}</span>
                        </div>
                    </div>
                    <button className="oc-close" onClick={onClose}>×</button>
                </div>

                <div className="oc-body">
                    <div className="oc-channel-toggle">
                        <button
                            type="button"
                            className={`oc-channel-btn ${channel === 'email' ? 'active' : ''}`}
                            onClick={() => setChannel('email')}
                        >
                            Send via Email
                        </button>
                        <button
                            type="button"
                            className={`oc-channel-btn ${channel === 'whatsapp' ? 'active' : ''}`}
                            onClick={() => setChannel('whatsapp')}
                            disabled={!customer.phone}
                            title={!customer.phone ? 'Customer has no phone number on file' : ''}
                        >
                            Send via WhatsApp
                        </button>
                    </div>

                    {loading ? (
                        <p className="oc-loading">Generating message…</p>
                    ) : (
                        <>
                            {genError && <p className="oc-gen-error">{genError}</p>}

                            <div className={`oc-section ${channel !== 'email' ? 'oc-section-dim' : ''}`}>
                                <label className="oc-label">Email subject</label>
                                <input
                                    type="text"
                                    className="oc-input"
                                    value={emailSubject}
                                    onChange={(e) => setEmailSubject(e.target.value)}
                                />
                                <label className="oc-label">Email body</label>
                                <textarea
                                    className="oc-textarea"
                                    rows={7}
                                    value={emailBody}
                                    onChange={(e) => setEmailBody(e.target.value)}
                                />
                            </div>

                            <div className={`oc-section ${channel !== 'whatsapp' ? 'oc-section-dim' : ''}`}>
                                <label className="oc-label">WhatsApp message</label>
                                <textarea
                                    className="oc-textarea"
                                    rows={4}
                                    value={whatsappText}
                                    onChange={(e) => setWhatsappText(e.target.value)}
                                />
                            </div>

                            <button
                                type="button"
                                className="oc-regenerate-btn"
                                onClick={generate}
                                disabled={loading}
                            >
                                Regenerate
                            </button>
                        </>
                    )}

                    {sendError && <p className="oc-send-error">{sendError}</p>}
                </div>

                <div className="oc-footer">
                    <button type="button" className="btn btn-cancel" onClick={onClose} disabled={sending}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn-save"
                        onClick={handleSend}
                        disabled={sending || loading}
                    >
                        {sending ? 'Sending…' : channel === 'email' ? 'Send Email' : 'Open in WhatsApp'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OutreachComposerModal;

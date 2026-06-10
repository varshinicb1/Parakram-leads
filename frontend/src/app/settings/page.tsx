'use client';

import React, { useState } from 'react';
import { Save, Key, Mail, Phone, Bell } from 'lucide-react';

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    openai_key: '',
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_password: '',
    twilio_sid: '',
    twilio_token: '',
    twilio_phone: '',
    whatsapp_key: '',
    whatsapp_phone_id: '',
    alert_phone: '',
    alert_email: '',
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const sections = [
    {
      title: 'OpenAI / LLM',
      icon: Key,
      fields: [
        { key: 'openai_key', label: 'API Key', type: 'password', placeholder: 'sk-...' },
      ],
    },
    {
      title: 'Email (SMTP)',
      icon: Mail,
      fields: [
        { key: 'smtp_host', label: 'SMTP Host', type: 'text', placeholder: 'smtp.gmail.com' },
        { key: 'smtp_port', label: 'Port', type: 'text', placeholder: '587' },
        { key: 'smtp_user', label: 'Username', type: 'text', placeholder: 'you@gmail.com' },
        { key: 'smtp_password', label: 'Password', type: 'password', placeholder: 'App password' },
      ],
    },
    {
      title: 'Twilio (SMS)',
      icon: Phone,
      fields: [
        { key: 'twilio_sid', label: 'Account SID', type: 'text', placeholder: 'AC...' },
        { key: 'twilio_token', label: 'Auth Token', type: 'password', placeholder: '...' },
        { key: 'twilio_phone', label: 'Phone Number', type: 'text', placeholder: '+1234567890' },
      ],
    },
    {
      title: 'WhatsApp Business API',
      icon: Phone,
      fields: [
        { key: 'whatsapp_key', label: 'API Key', type: 'password', placeholder: '...' },
        { key: 'whatsapp_phone_id', label: 'Phone Number ID', type: 'text', placeholder: '...' },
      ],
    },
    {
      title: 'Personal Alerts',
      icon: Bell,
      fields: [
        { key: 'alert_phone', label: 'Alert Phone', type: 'text', placeholder: '+919876543210' },
        { key: 'alert_email', label: 'Alert Email', type: 'email', placeholder: 'you@example.com' },
      ],
    },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      {sections.map((section) => {
        const Icon = section.icon;
        return (
          <div key={section.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <Icon className="w-5 h-5 text-sigma-600" />
              <h3 className="font-semibold text-gray-800">{section.title}</h3>
            </div>
            <div className="space-y-4">
              {section.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-600 mb-1">{field.label}</label>
                  <input
                    type={field.type}
                    value={(settings as any)[field.key]}
                    onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sigma-500 outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 bg-sigma-600 text-white rounded-lg font-medium hover:bg-sigma-700 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

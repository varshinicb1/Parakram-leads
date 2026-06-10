'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { MessageSquare, CheckCircle, Clock, XCircle } from 'lucide-react';

export default function MessagesPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.messages.list()
      .then(setMessages)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'delivered': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'opened': return <MessageSquare className="w-4 h-4 text-amber-500" />;
      case 'replied': return <MessageSquare className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sigma-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {messages.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400">No messages sent yet. Approve outreach to send messages.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {messages.map((msg) => (
              <div key={msg.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(msg.status)}
                    <span className="text-xs font-medium uppercase text-gray-400">{msg.channel}</span>
                    <span className="text-xs text-gray-400">{new Date(msg.created_at).toLocaleString()}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                    msg.status === 'sent' ? 'bg-blue-50 text-blue-600' :
                    msg.status === 'delivered' ? 'bg-green-50 text-green-600' :
                    msg.status === 'opened' ? 'bg-amber-50 text-amber-600' :
                    msg.status === 'replied' ? 'bg-green-50 text-green-600' :
                    msg.status === 'failed' ? 'bg-red-50 text-red-600' :
                    'bg-gray-50 text-gray-600'
                  }`}>
                    {msg.status}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">{msg.content}</p>
                {msg.reply_content && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-600 font-medium mb-1">Reply Received</p>
                    <p className="text-sm text-green-800">{msg.reply_content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

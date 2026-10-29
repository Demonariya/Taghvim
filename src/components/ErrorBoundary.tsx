/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      copied: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught exception:', error, errorInfo);
  }

  handleCopy = () => {
    if (!this.state.error) return;
    const text = `${this.state.error.name}: ${this.state.error.message}\n${this.state.error.stack || ''}`;
    navigator.clipboard.writeText(text).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    }).catch(() => {
      // Ignore clipboard write failures
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 bg-[#07080b] text-[#e6e9ef] font-['Digikala',sans-serif] select-none"
        >
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#14171f] border border-red-500/30 shadow-2xl flex flex-col gap-4 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 text-2xl font-bold">
              !
            </div>
            <h1 className="text-xl font-bold text-red-400">
              خطا در اجرای برنامه
            </h1>
            <p className="text-sm text-[#9ca3af] leading-relaxed">
              متأسفانه خطایی در اجرای تقویم رخ داده است. می‌توانید متن خطا را برای بررسی فنی کپی کنید یا برنامه را مجدداً بارگذاری نمایید.
            </p>
            {this.state.error && (
              <div
                dir="ltr"
                className="max-h-40 overflow-y-auto p-3 rounded-lg bg-[#0a0c10] border border-white/10 text-xs text-red-300 font-mono text-left select-text whitespace-pre-wrap break-all"
              >
                {this.state.error.toString()}
                {this.state.error.stack ? `\n\n${this.state.error.stack}` : ''}
              </div>
            )}
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={this.handleCopy}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium bg-[#1f2430] hover:bg-[#282e3e] text-[#22d3ee] border border-[#22d3ee]/30 transition-colors"
              >
                {this.state.copied ? 'کپی شد!' : 'کپی متن خطا'}
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium bg-[#22d3ee] hover:bg-[#06b6d4] text-[#07080b] font-bold transition-colors"
              >
                بارگذاری مجدد
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

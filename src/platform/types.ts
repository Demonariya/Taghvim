/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PlatformTarget = 'android' | 'windows';

export interface PlatformAdapter {
  target: PlatformTarget;
  sendNotification: (title: string, body: string) => Promise<void>;
}

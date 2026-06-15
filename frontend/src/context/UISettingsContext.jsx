import { createContext, useContext } from 'react'

const UISettingsContext = createContext({
  hide_maps: false,
  hide_tokens: false,
  hide_campaigns: false,
  disable_password_change: false,
  campaign_uploads_disabled: false,
  campaign_upload_max_file_mb: 0,
  campaign_upload_max_total_mb: 0,
})

export const UISettingsProvider = UISettingsContext.Provider

export function useUISettings() {
  return useContext(UISettingsContext)
}

/**
 * supabase-config.js - Supabase 프로젝트 설정
 * 
 * 📌 [설정 방법]
 * 1. https://supabase.com 접속 후 프로젝트 생성
 * 2. Project Settings > API 메뉴에서 아래 두 값을 복사하여 여기에 붙여넣으세요.
 */
const SUPABASE_CONFIG = {
  // 예: 'https://xyzcompany.supabase.co'
  url: 'https://rhsvvbjbpoyvmyvkfngu.supabase.co',

  // 예: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoc3Z2YmpicG95dm15dmtmbmd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1NjkyNTMsImV4cCI6MjEwNTE0NTI1M30.iwyHsVV4BDngFOlGsZMJ95maJzsXQ0Hgzsc_3jqU_m0'
};

if (typeof window !== 'undefined') {
  window.SUPABASE_CONFIG = SUPABASE_CONFIG;
}

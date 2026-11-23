-- =========================================================
-- English Stock 追加SQL：品詞とコメント（どちらも任意）
-- Supabase Dashboard → SQL Editor に貼り付けて「Run」で1回だけ実行する。
--
-- ・空の列を2つ追加するだけで、既存のデータは変更しない（既存データはどちらも未設定になる）。
-- ・アクセス制限（RLS・権限）は stocks テーブルのものがそのまま適用される。
-- =========================================================

begin;

alter table public.stocks
    -- 品詞（単語のときだけ使う。未設定でもよい）
    add column part_of_speech text
        check (part_of_speech in (
            '名詞', '代名詞', '動詞', '形容詞', '副詞',
            '助動詞', '前置詞', '冠詞', '接続詞', '間投詞'
        )),
    -- コメント（自由なメモ。未設定でもよい。500文字まで）
    add column note text
        check (note is null or char_length(note) <= 500);

commit;

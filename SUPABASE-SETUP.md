# Supabase setup za login in profile

Ta aplikacija ostane statična in jo lahko deployamo prek GitHuba. Login, gesla in dodelitev profilov morajo biti v Supabase, ker statična stran ne sme hraniti gesel.

## 1. Ustvari Supabase projekt

V Supabase odpri nov projekt in v Authentication omogoči email/password login.

## 2. Zaženi SQL shemo

V Supabase SQL editor prilepi in zaženi:

```text
supabase-schema.sql
```

Ta ustvari:

- `portal_profiles`
- `portal_user_access`
- osnovne profile za SI, HR, SR in admin
- RLS pravila, da uporabnik vidi samo svoj dostop, admin pa lahko ureja vse

## 3. Ustvari prvega admin uporabnika

V Supabase Authentication ustvari uporabnika z emailom in geslom.

Najlažja pot: prijavi se v portal s tem uporabnikom, odpri `Settings` in klikni **Nastavi me kot prvega admina**. To deluje samo, če v portalu še ni nobenega admina.

Ročna pot: v SQL editorju dodaj njegov dostop:

```sql
insert into public.portal_user_access (user_email, profile_id, can_edit_content, is_admin)
values ('admin@example.com', 'admin', true, true)
on conflict (user_email) do update set
  profile_id = excluded.profile_id,
  can_edit_content = excluded.can_edit_content,
  is_admin = excluded.is_admin;
```

Zamenjaj `admin@example.com` z dejanskim emailom.

## 4. Vklopi auth v aplikaciji

Kopiraj vrednosti iz Supabase Project settings:

- Project URL
- anon public key

Vpiši jih v:

```text
data/auth-config.json
```

Primer:

```json
{
  "enabled": true,
  "supabaseUrl": "https://YOUR-PROJECT.supabase.co",
  "anonKey": "YOUR-SUPABASE-ANON-KEY"
}
```

Ko je `enabled: true`, aplikacija zahteva prijavo. Ko je `enabled: false`, ostane lokalni razvojni način.

## 5. Upravljanje uporabnikov

Uporabnika najprej ustvari v Supabase Authentication.

Nato se kot admin prijavi v aplikacijo in odpri `Settings`:

- dodeli email uporabnika
- izberi profil
- označi, ali lahko ureja tekst
- označi, ali je admin

Od tega je odvisno, katere zavihke in funkcije uporabnik vidi po prijavi.

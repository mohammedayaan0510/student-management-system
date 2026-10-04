# Student Management System

A high-performance, responsive full-stack web application for managing academic student records, calculating cumulative performance metrics, and persisting data with Row-Level Security (RLS).

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Stack](https://img.shields.io/badge/Stack-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS%20%7C%20Supabase-emerald)

---

## Key Features

* **Google OAuth 2.0 Authentication:** Secure, single-click sign-in handled via Supabase Auth identity provider.
* **Row-Level Security (RLS):** Isolated user sessions powered by PostgreSQL policies—users can strictly manage only their own records.
* **Dynamic Performance Metrics:**
  * **SGPA & Credit Tracking:** Record term GPA and earned credits per profile.
  * **Real-time CGPA Calculation:** Computes cumulative weighted average dynamically across stored records:
    $$\text{CGPA} = \frac{\sum (\text{SGPA}_i \times \text{Credits}_i)}{\sum \text{Credits}_i}$$
* **Instant Search & In-Memory Filtering:** Real-time search across student profiles by name or USN/ID without redundant backend roundtrips.
* **CSV Data Export:** One-click data export converting active records into a formatted `.csv` file.
* **Adaptive Theme Engine:** Navy & Steel Blue aesthetic with persistent Light/Dark mode toggling.

---

## Tech Stack

* **Frontend:** HTML5, Modern CSS3 (CSS Custom Properties & Flexbox/Grid), Vanilla JavaScript (ES6+).
* **Backend & Database:** [Supabase](https://supabase.com/) (PostgreSQL database, Authentication, Realtime JS Client).
* **Hosting:** Vercel.

---

## Database Schema & Migration

The application relies on a single `students` table configured with PostgreSQL Row-Level Security.

```sql
-- Create Students Table
create table public.students (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    full_name text not null,
    student_id text not null,
    course text not null,
    sgpa numeric(4,2) default 0.00,
    credits integer default 0
);

-- Enable Row Level Security (RLS)
alter table public.students enable row level security;

-- Create Security Policies
create policy "Users can view their own student records"
    on public.students for select
    using (auth.uid() = user_id);

create policy "Users can insert their own student records"
    on public.students for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own student records"
    on public.students for update
    using (auth.uid() = user_id);

create policy "Users can delete their own student records"
    on public.students for delete
    using (auth.uid() = user_id);

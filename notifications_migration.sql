-- Create notifications table
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  type text not null check (type in ('create', 'delete', 'update', 'reminder')),
  message text not null,
  read boolean default false,
  data jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table notifications enable row level security;

-- Policies
create policy "Users can view their own notifications" 
  on notifications for select 
  using (auth.uid() = user_id);

create policy "Users can insert notifications" 
  on notifications for insert 
  with check (true);

create policy "Users can update their own notifications" 
  on notifications for update 
  using (auth.uid() = user_id);

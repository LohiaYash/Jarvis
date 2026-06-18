import pg from "pg";
import { env } from "../config/env.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10
});

export async function migrate(): Promise<void> {
  await pool.query(`
    create table if not exists audit_logs (
      id text primary key,
      actor text not null,
      action text not null,
      risk text not null,
      approved boolean not null default false,
      details jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );

    create table if not exists memories (
      id text primary key,
      user_id text not null,
      scope text not null,
      content text not null,
      tags text[] not null default '{}',
      importance numeric not null default 0.5,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists conversations (
      id text primary key,
      user_id text not null,
      title text not null default 'Conversation',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists messages (
      id text primary key,
      conversation_id text not null references conversations(id) on delete cascade,
      role text not null,
      content text not null,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );

    create table if not exists scheduled_jobs (
      id text primary key,
      name text not null,
      prompt text not null,
      cron text not null,
      enabled boolean not null default true,
      created_at timestamptz not null default now()
    );

    create table if not exists tool_approvals (
      id text primary key,
      user_id text not null,
      conversation_id text not null,
      task_id text not null,
      tool_call jsonb not null,
      status text not null default 'pending',
      result jsonb,
      error text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists oauth_connections (
      id text primary key,
      user_id text not null,
      provider text not null,
      scopes text[] not null default '{}',
      access_token text not null,
      refresh_token text,
      expires_at timestamptz,
      profile jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (user_id, provider)
    );
  `);
}

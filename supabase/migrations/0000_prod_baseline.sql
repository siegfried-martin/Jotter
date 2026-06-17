--
-- Jotter prod baseline schema (PUBLIC schema only).
-- Captured 2026-06-16 from jotter-prod (ref wccmdhtjckzwywffvnsp) via pg_dump 17,
-- then filtered to the public schema + the two auth.users onboarding triggers
-- (auth/storage/realtime/etc. are Supabase-managed and already exist on every project).
-- This is the migration-rehearsal baseline; jotter-dev is replicated from it.
-- See supabase/README.md.
--
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.10 (Ubuntu 17.10-1.pgdg24.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: check_collection_limit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_collection_limit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.collections WHERE user_id = NEW.user_id) >= 12 THEN
    RAISE EXCEPTION 'Maximum of 12 collections per user reached';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: check_container_limit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_container_limit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.note_container WHERE collection_id = NEW.collection_id) >= 100 THEN
    RAISE EXCEPTION 'Maximum of 100 containers per collection reached';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: check_section_limit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_section_limit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.note_section WHERE note_container_id = NEW.note_container_id) >= 50 THEN
    RAISE EXCEPTION 'Maximum of 50 sections per container reached';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: create_default_collection_for_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_default_collection_for_user() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Add some debugging and ensure the user exists
    RAISE NOTICE 'Creating default collection for user: %', NEW.id;
    
    INSERT INTO public.collections (name, description, color, is_default, user_id)
    VALUES ('Default', 'Your default collection', '#3B82F6', true, NEW.id);
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating default collection: %', SQLERRM;
    RETURN NEW; -- Don't fail the user creation if collection creation fails
END;
$$;


--
-- Name: create_default_preferences_for_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_default_preferences_for_user() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE NOTICE 'Creating default preferences for user: %', NEW.id;
    
    INSERT INTO public.user_preferences (user_id, theme, default_editor, auto_save_delay, keyboard_shortcuts)
    VALUES (NEW.id, 'light', 'code', 1000, '{}');
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating default preferences: %', SQLERRM;
    RETURN NEW; -- Don't fail the user creation if preferences creation fails
END;
$$;


--
-- Name: get_next_collection_sequence(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_next_collection_sequence(p_user_id uuid) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    next_seq INTEGER;
BEGIN
    SELECT COALESCE(MAX(sequence), 0) + 10 
    INTO next_seq 
    FROM collections 
    WHERE user_id = p_user_id;
    
    RETURN next_seq;
END;
$$;


--
-- Name: get_next_note_container_sequence(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_next_note_container_sequence(p_collection_id uuid) RETURNS integer
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN COALESCE(
    (SELECT MIN(sequence) - 10 FROM note_container WHERE collection_id = p_collection_id),
    10
  );
END;
$$;


--
-- Name: get_next_note_section_sequence(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_next_note_section_sequence(p_note_container_id uuid) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    next_seq INTEGER;
BEGIN
    SELECT COALESCE(MAX(sequence), 0) + 10 
    INTO next_seq 
    FROM note_section 
    WHERE note_container_id = p_note_container_id;
    
    RETURN next_seq;
END;
$$;


--
-- Name: handle_new_collection(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_collection() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Set sequence if not provided
  IF NEW.sequence IS NULL OR NEW.sequence = 0 THEN
    NEW.sequence := get_next_collection_sequence(NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_note_container(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_note_container() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Set sequence if not provided
  IF NEW.sequence IS NULL OR NEW.sequence = 0 THEN
    NEW.sequence := get_next_note_container_sequence(NEW.collection_id);
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_note_section(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_note_section() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Set sequence if not provided
  IF NEW.sequence IS NULL OR NEW.sequence = 0 THEN
    NEW.sequence := get_next_note_section_sequence(NEW.note_container_id);
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    old_search_path text;
BEGIN
    -- Save current search path
    SELECT current_setting('search_path') INTO old_search_path;
    
    -- Set search path to include public schema
    PERFORM set_config('search_path', 'public, auth', false);
    
    -- Create default collection
    INSERT INTO collections (name, description, user_id, is_default, sequence)
    VALUES (
        'Personal', 
        'Your personal notes and ideas', 
        NEW.id, 
        TRUE, 
        get_next_collection_sequence(NEW.id)
    );
    
    -- Create default user preferences
    INSERT INTO user_preferences (user_id)
    VALUES (NEW.id);
    
    -- Restore original search path
    PERFORM set_config('search_path', old_search_path, false);
    
    RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: validate_note_container_user_match(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_note_container_user_match() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.user_id != (SELECT user_id FROM collections WHERE id = NEW.collection_id) THEN
        RAISE EXCEPTION 'Note container user_id must match collection user_id';
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: validate_note_section_user_match(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_note_section_user_match() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.user_id != (SELECT user_id FROM note_container WHERE id = NEW.note_container_id) THEN
        RAISE EXCEPTION 'Note section user_id must match note container user_id';
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: collections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    user_id uuid NOT NULL,
    color character varying(7) DEFAULT '#3B82F6'::character varying,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    sequence integer DEFAULT 0 NOT NULL,
    CONSTRAINT collections_description_length CHECK (((description IS NULL) OR (length(description) <= 500)))
);


--
-- Name: collections_backup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collections_backup (
    id uuid,
    name character varying,
    description text,
    user_id uuid,
    color character varying,
    is_default boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    sequence integer
);


--
-- Name: deleted_orphan_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deleted_orphan_notes (
    id uuid,
    title text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    user_id uuid,
    collection_id uuid,
    sequence integer
);


--
-- Name: event_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    session_id uuid NOT NULL,
    event_type text NOT NULL,
    entity_type text,
    entity_id uuid,
    parent_id uuid,
    event_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: migration_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migration_log (
    migration_start timestamp with time zone,
    status text,
    total_collections bigint,
    collection_users bigint,
    default_collections bigint,
    total_notes bigint,
    orphaned_notes bigint,
    notes_no_user bigint
);


--
-- Name: note_container; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.note_container (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid NOT NULL,
    collection_id uuid NOT NULL,
    sequence integer DEFAULT 0 NOT NULL,
    CONSTRAINT note_container_title_length CHECK ((length(title) <= 200))
);


--
-- Name: note_container_backup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.note_container_backup (
    id uuid,
    title text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    user_id uuid,
    collection_id uuid,
    sequence integer
);


--
-- Name: note_section; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.note_section (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    note_container_id uuid NOT NULL,
    type text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    sequence integer NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    checklist_data jsonb,
    user_id uuid NOT NULL,
    title text,
    CONSTRAINT note_section_checklist_data_length CHECK (((checklist_data IS NULL) OR (length((checklist_data)::text) <= 500000))),
    CONSTRAINT note_section_content_length CHECK ((length(content) <= 1000000)),
    CONSTRAINT note_section_meta_length CHECK ((length((meta)::text) <= 50000)),
    CONSTRAINT note_section_title_length CHECK (((title IS NULL) OR (length(title) <= 200))),
    CONSTRAINT note_section_type_check CHECK ((type = ANY (ARRAY['checklist'::text, 'code'::text, 'wysiwyg'::text, 'diagram'::text])))
);


--
-- Name: note_section_backup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.note_section_backup (
    id uuid,
    note_container_id uuid,
    type text,
    content text,
    sequence integer,
    meta jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    checklist_data jsonb,
    user_id uuid
);


--
-- Name: removed_defaults; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.removed_defaults (
    id uuid,
    name character varying,
    description text,
    user_id uuid,
    color character varying,
    is_default boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    sequence integer
);


--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    theme character varying(20) DEFAULT 'light'::character varying,
    default_editor character varying(20) DEFAULT 'code'::character varying,
    auto_save_delay integer DEFAULT 1000,
    keyboard_shortcuts jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_visited_collection_id uuid,
    last_visited_container_id uuid,
    CONSTRAINT user_preferences_keyboard_shortcuts_length CHECK ((length((keyboard_shortcuts)::text) <= 10000))
);


--
-- Name: collections collections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections
    ADD CONSTRAINT collections_pkey PRIMARY KEY (id);


--
-- Name: event_log event_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_log
    ADD CONSTRAINT event_log_pkey PRIMARY KEY (id);


--
-- Name: note_container note_container_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_container
    ADD CONSTRAINT note_container_pkey PRIMARY KEY (id);


--
-- Name: note_section note_section_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_section
    ADD CONSTRAINT note_section_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_key UNIQUE (user_id);


--
-- Name: collections_user_default_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX collections_user_default_unique ON public.collections USING btree (user_id) WHERE (is_default = true);


--
-- Name: idx_collections_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collections_user_id ON public.collections USING btree (user_id);


--
-- Name: idx_collections_user_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collections_user_sequence ON public.collections USING btree (user_id, sequence);


--
-- Name: idx_event_log_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_log_created ON public.event_log USING btree (created_at);


--
-- Name: idx_event_log_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_log_entity ON public.event_log USING btree (entity_type, entity_id);


--
-- Name: idx_event_log_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_log_session ON public.event_log USING btree (session_id);


--
-- Name: idx_event_log_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_log_type ON public.event_log USING btree (event_type);


--
-- Name: idx_event_log_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_log_user ON public.event_log USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_note_container_collection_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_container_collection_id ON public.note_container USING btree (collection_id);


--
-- Name: idx_note_container_collection_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_container_collection_sequence ON public.note_container USING btree (collection_id, sequence);


--
-- Name: idx_note_container_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_container_user_id ON public.note_container USING btree (user_id);


--
-- Name: idx_note_section_container_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_section_container_id ON public.note_section USING btree (note_container_id);


--
-- Name: idx_note_section_container_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_section_container_sequence ON public.note_section USING btree (note_container_id, sequence);


--
-- Name: idx_note_section_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_section_sequence ON public.note_section USING btree (note_container_id, sequence);


--
-- Name: idx_note_section_title; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_section_title ON public.note_section USING btree (title);


--
-- Name: idx_note_section_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_section_user_id ON public.note_section USING btree (user_id);


--
-- Name: idx_user_preferences_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_preferences_user_id ON public.user_preferences USING btree (user_id);


--
-- Name: users create_default_collection_trigger; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER create_default_collection_trigger AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_default_collection_for_user();


--
-- Name: users create_default_preferences_trigger; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER create_default_preferences_trigger AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_default_preferences_for_user();


--
-- Name: collections enforce_collection_limit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_collection_limit BEFORE INSERT ON public.collections FOR EACH ROW EXECUTE FUNCTION public.check_collection_limit();


--
-- Name: note_container enforce_container_limit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_container_limit BEFORE INSERT ON public.note_container FOR EACH ROW EXECUTE FUNCTION public.check_container_limit();


--
-- Name: note_section enforce_section_limit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_section_limit BEFORE INSERT ON public.note_section FOR EACH ROW EXECUTE FUNCTION public.check_section_limit();


--
-- Name: note_container note_container_user_validation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER note_container_user_validation BEFORE INSERT OR UPDATE ON public.note_container FOR EACH ROW EXECUTE FUNCTION public.validate_note_container_user_match();


--
-- Name: note_section note_section_user_validation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER note_section_user_validation BEFORE INSERT OR UPDATE ON public.note_section FOR EACH ROW EXECUTE FUNCTION public.validate_note_section_user_match();


--
-- Name: collections on_collection_created; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_collection_created BEFORE INSERT ON public.collections FOR EACH ROW EXECUTE FUNCTION public.handle_new_collection();


--
-- Name: note_container on_note_container_created; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_note_container_created BEFORE INSERT ON public.note_container FOR EACH ROW EXECUTE FUNCTION public.handle_new_note_container();


--
-- Name: note_section on_note_section_created; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_note_section_created BEFORE INSERT ON public.note_section FOR EACH ROW EXECUTE FUNCTION public.handle_new_note_section();


--
-- Name: collections update_collections_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON public.collections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: note_container update_note_container_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_note_container_updated_at BEFORE UPDATE ON public.note_container FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: note_section update_note_section_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_note_section_updated_at BEFORE UPDATE ON public.note_section FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_preferences update_user_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: collections collections_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections
    ADD CONSTRAINT collections_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: event_log event_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_log
    ADD CONSTRAINT event_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: note_container note_container_collection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_container
    ADD CONSTRAINT note_container_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE;


--
-- Name: note_container note_container_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_container
    ADD CONSTRAINT note_container_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: note_section note_section_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_section
    ADD CONSTRAINT note_section_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: note_section note_sections_container_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_section
    ADD CONSTRAINT note_sections_container_id_fkey FOREIGN KEY (note_container_id) REFERENCES public.note_container(id) ON DELETE CASCADE;


--
-- Name: user_preferences user_preferences_last_visited_collection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_last_visited_collection_id_fkey FOREIGN KEY (last_visited_collection_id) REFERENCES public.collections(id) ON DELETE SET NULL;


--
-- Name: user_preferences user_preferences_last_visited_container_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_last_visited_container_id_fkey FOREIGN KEY (last_visited_container_id) REFERENCES public.note_container(id) ON DELETE SET NULL;


--
-- Name: user_preferences user_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: event_log Anyone can insert events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert events" ON public.event_log FOR INSERT WITH CHECK (true);


--
-- Name: collections Users can delete their own collections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own collections" ON public.collections FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: note_container Users can delete their own note containers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own note containers" ON public.note_container FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: note_section Users can delete their own note sections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own note sections" ON public.note_section FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: collections Users can insert their own collections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own collections" ON public.collections FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: note_container Users can insert their own note containers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own note containers" ON public.note_container FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: note_section Users can insert their own note sections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own note sections" ON public.note_section FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_preferences Users can insert their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own preferences" ON public.user_preferences FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: event_log Users can read own events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own events" ON public.event_log FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: collections Users can update their own collections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own collections" ON public.collections FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: note_container Users can update their own note containers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own note containers" ON public.note_container FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: note_section Users can update their own note sections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own note sections" ON public.note_section FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_preferences Users can update their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own preferences" ON public.user_preferences FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: collections Users can view their own collections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own collections" ON public.collections FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: note_container Users can view their own note containers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own note containers" ON public.note_container FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: note_section Users can view their own note sections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own note sections" ON public.note_section FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_preferences Users can view their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own preferences" ON public.user_preferences FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: event_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_log ENABLE ROW LEVEL SECURITY;

--
-- Name: note_container; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.note_container ENABLE ROW LEVEL SECURITY;

--
-- Name: note_section; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.note_section ENABLE ROW LEVEL SECURITY;

--
-- Name: user_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;


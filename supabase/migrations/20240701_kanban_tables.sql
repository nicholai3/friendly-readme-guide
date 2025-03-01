-- Create enums for task types and priorities
CREATE TYPE task_type AS ENUM ('Tax Filing', 'Audit', 'Consultation', 'Bookkeeping', 'Payroll');
CREATE TYPE task_priority AS ENUM ('Low', 'Medium', 'High', 'Urgent');

-- Create kanban_columns table
CREATE TABLE kanban_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create kanban_tasks table
CREATE TABLE kanban_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  task_type task_type NOT NULL,
  client_name TEXT,
  deadline DATE,
  priority task_priority NOT NULL,
  assigned_to TEXT,
  column_id UUID NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_kanban_tasks_column_id ON kanban_tasks(column_id);
CREATE INDEX idx_kanban_tasks_assigned_to ON kanban_tasks(assigned_to);

-- Add RLS (Row Level Security) policies
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users to read columns"
  ON kanban_columns
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert columns"
  ON kanban_columns
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update columns"
  ON kanban_columns
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete columns"
  ON kanban_columns
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read tasks"
  ON kanban_tasks
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert tasks"
  ON kanban_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update tasks"
  ON kanban_tasks
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete tasks"
  ON kanban_tasks
  FOR DELETE
  TO authenticated
  USING (true);

-- Insert default columns
INSERT INTO kanban_columns (title, order_index) VALUES
  ('Backlog', 1),
  ('In Progress', 2),
  ('Review', 3),
  ('Complete', 4);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update the updated_at column
CREATE TRIGGER update_kanban_columns_updated_at
BEFORE UPDATE ON kanban_columns
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kanban_tasks_updated_at
BEFORE UPDATE ON kanban_tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 
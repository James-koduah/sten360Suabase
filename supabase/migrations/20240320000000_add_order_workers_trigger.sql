-- Create trigger for creating tasks when order workers are assigned
CREATE TRIGGER create_tasks_for_order_workers_trigger
AFTER INSERT ON order_workers
FOR EACH ROW
EXECUTE FUNCTION create_tasks_for_order_workers(); 
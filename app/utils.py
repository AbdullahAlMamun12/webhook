

def humanize_bytes(bytes):
    """Converts bytes to a human-readable format."""
    if bytes is None:
        return "N/A"
    units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
    i = 0
    while bytes >= 1024 and i < len(units) - 1:
        bytes /= 1024
        i += 1
    return f"{bytes:.1f} {units[i]}"
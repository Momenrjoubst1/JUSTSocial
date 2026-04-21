<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Menu;
use Carbon\Carbon;
use Support\Str;
use Session;
use Cookie;

class CmsController extends Controller
{
    public function save_data(Request $request)
    {
        $id = $request->input('id');
        $item = Menu::find($id);
        $item->title = $request->input('title');
        $item->content = $request->input('content');
        $item->save();

        return response()->json(['success' => true, 'message' => 'Data saved successfully']);
    }

    public function get_cookie_option()
    {
        return request()->cookie('theme_option', 'light');
    }

    public function formatDate($field)
    {
        return Carbon::parse($field)->format('d-m-Y');
    }

    public function search_data(Request $request)
    {
        $query = $request->input('query');
        $results = Menu::where('title', 'LIKE', "%{$query}%")->get();
        return response()->json($this->format_data($results, true));
    }

    public function format_data($results, $is_search = false)
    {
        $formatted = [];
        foreach ($results as $result) {
            $formatted[] = [
                'id' => $result->id,
                'title' => $result->title,
                'content' => $is_search ? Str::limit($result->content, 100) : $result->content,
                'created_at' => $this->formatDate($result->created_at)
            ];
        }
        return $formatted;
    }

    public function createTree($elements, $parentId = 0)
    {
        $branch = array();

        foreach ($elements as $element) {
            if ($element['parent_id'] == $parentId) {
                $children = $this->createTree($elements, $element['id']);
                if ($children) {
                    $element['children'] = $children;
                }
                $branch[] = $element;
            }
        }

        return $branch;
    }
}
